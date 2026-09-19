import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateShopInput, ShopPricingRulesInput } from '@secureprint/validation';
import { ShopStatus, UserRole } from '@secureprint/shared-types';
import * as bcrypt from 'bcryptjs';
import * as QRCode from 'qrcode';

@Injectable()
export class ShopsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async createShop(input: CreateShopInput, actorId?: string, actorRole?: string) {
    const existingSlug = await this.prisma.shop.findUnique({
      where: { slug: input.slug.toLowerCase().trim() },
    });
    if (existingSlug) {
      throw new ConflictException(`Shop slug '${input.slug}' is already taken.`);
    }

    const existingEmail = await this.prisma.user.findUnique({
      where: { email: input.ownerEmail.toLowerCase().trim() },
    });
    if (existingEmail) {
      throw new ConflictException(`Email '${input.ownerEmail}' is already registered.`);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(input.ownerPassword, salt);

    // Initial default pricing rules for India cyber cafe market
    const defaultPricing = {
      ratePerBwPage: 2.0,
      ratePerColorPage: 10.0,
      rateA3Multiplier: 2.0,
      rateLegalMultiplier: 1.2,
      duplexDiscountPercent: 10,
      minimumOrderAmount: 2.0,
      currency: 'INR',
    };

    return this.prisma.$transaction(async (tx) => {
      // New shops start strictly as PENDING_PAYMENT until verified subscription
      const shop = await tx.shop.create({
        data: {
          name: input.name,
          slug: input.slug.toLowerCase().trim(),
          address: input.address,
          phone: input.phone,
          status: ShopStatus.PENDING_PAYMENT,
          shopSettings: {
            create: {
              pricingRulesJson: defaultPricing,
              autoPrintEnabled: false,
              cashAccepted: true,
            },
          },
        },
      });

      const owner = await tx.user.create({
        data: {
          name: input.ownerName,
          email: input.ownerEmail.toLowerCase().trim(),
          passwordHash,
          role: UserRole.SHOP_OWNER,
          shopId: shop.id,
        },
      });

      await tx.shopMember.create({
        data: {
          shopId: shop.id,
          userId: owner.id,
          role: UserRole.SHOP_OWNER,
        },
      });

      await this.auditService.log({
        actorId,
        actorRole,
        shopId: shop.id,
        action: 'SHOP_CREATED',
        entity: 'SHOP',
        entityId: shop.id,
        metadata: { name: shop.name, slug: shop.slug, ownerEmail: owner.email },
      });

      return {
        shop,
        owner: {
          id: owner.id,
          name: owner.name,
          email: owner.email,
        },
      };
    });
  }

  async getAllShops() {
    return this.prisma.shop.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        users: {
          where: { role: UserRole.SHOP_OWNER },
          select: { id: true, name: true, email: true },
        },
        subscriptions: {
          where: { status: 'ACTIVE' },
          include: { plan: true },
          take: 1,
        },
        _count: {
          select: {
            printJobs: true,
            printers: true,
            desktopAgents: true,
          },
        },
      },
    });
  }

  async getShopById(shopId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      include: {
        shopSettings: true,
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
        },
        printers: true,
        desktopAgents: true,
        users: { select: { id: true, name: true, email: true, role: true, isActive: true } },
      },
    });

    if (!shop) throw new NotFoundException('Shop not found.');
    return shop;
  }

  async getAllShopkeepers() {
    return this.prisma.user.findMany({
      where: {
        role: { in: [UserRole.SHOP_OWNER, UserRole.SHOP_STAFF] },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        shop: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
      },
    });
  }

  async getPublicShopBySlug(slug: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { slug: slug.toLowerCase().trim() },
      select: {
        id: true,
        name: true,
        slug: true,
        address: true,
        phone: true,
        status: true,
        shopSettings: {
          select: {
            pricingRulesJson: true,
            operatingHoursJson: true,
            cashAccepted: true,
          },
        },
      },
    });

    if (!shop) throw new NotFoundException(`Shop with slug '${slug}' does not exist.`);
    return shop;
  }

  async updateShopStatus(shopId: string, status: ShopStatus, actorId?: string, actorRole?: string) {
    const shop = await this.prisma.shop.update({
      where: { id: shopId },
      data: { status },
    });

    await this.auditService.log({
      actorId,
      actorRole,
      shopId,
      action: `SHOP_STATUS_CHANGED_${status}`,
      entity: 'SHOP',
      entityId: shopId,
      metadata: { newStatus: status },
    });

    return shop;
  }

  async updateSettings(shopId: string, pricingRules?: ShopPricingRulesInput, autoPrint?: boolean, cashAccepted?: boolean) {
    return this.prisma.shopSettings.upsert({
      where: { shopId },
      update: {
        pricingRulesJson: pricingRules as any,
        autoPrintEnabled: autoPrint,
        cashAccepted,
      },
      create: {
        shopId,
        pricingRulesJson: pricingRules as any,
        autoPrintEnabled: autoPrint ?? false,
        cashAccepted: cashAccepted ?? true,
      },
    });
  }

  async getPermanentQr(shopId: string, publicBaseUrl?: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { id: true, name: true, slug: true },
    });

    if (!shop) throw new NotFoundException('Shop not found.');

    // Dynamic resolution order:
    // 1. Explicitly requested publicBaseUrl (e.g. from frontend detecting LAN IP or configured base)
    // 2. PUBLIC_BASE_URL or NEXT_PUBLIC_APP_URL or APP_URL env vars
    // 3. Fallback to localhost in development
    const rawBaseUrl =
      publicBaseUrl ||
      process.env.PUBLIC_BASE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      'http://localhost:3000';

    const cleanBaseUrl = rawBaseUrl.trim().replace(/\/+$/, '');

    // Strict Production Check: never encode loopback/localhost in production
    const isProd = process.env.NODE_ENV === 'production';
    const isLoopback =
      cleanBaseUrl.includes('localhost') ||
      cleanBaseUrl.includes('127.0.0.1') ||
      cleanBaseUrl.includes('0.0.0.0');

    if (isProd && isLoopback) {
      throw new BadRequestException(
        'Production counter QR generation requires a real public HTTPS URL (e.g. https://yourdomain.com), not a localhost/loopback address.',
      );
    }

    // The permanent QR MUST encode the customer storefront entry URL
    const publicUrl = `${cleanBaseUrl}/s/${shop.slug}`;
    const qrDataUrl = await QRCode.toDataURL(publicUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 512,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });

    const qrSvg = await QRCode.toString(publicUrl, {
      type: 'svg',
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });

    return {
      shopId: shop.id,
      shopName: shop.name,
      shopSlug: shop.slug,
      publicUrl,
      qrDataUrl,
      qrSvg,
    };
  }
}
