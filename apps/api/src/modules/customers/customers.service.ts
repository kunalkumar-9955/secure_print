import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StartCustomerSessionInput } from '@secureprint/validation';
import { ShopStatus } from '@secureprint/shared-types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async startSession(input: StartCustomerSessionInput) {
    const shop = await this.prisma.shop.findUnique({
      where: { slug: input.shopSlug.toLowerCase().trim() },
      select: { id: true, name: true, slug: true, status: true },
    });

    if (!shop) {
      throw new NotFoundException(`Print shop '${input.shopSlug}' not found.`);
    }

    if (shop.status !== ShopStatus.ACTIVE) {
      throw new ForbiddenException(
        'This print shop is currently not accepting new print jobs. Please verify with the counter.',
      );
    }

    // Session expires in 24 hours
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const session = await this.prisma.customerSession.create({
      data: {
        shopId: shop.id,
        sessionToken: uuidv4(),
        customerName: input.customerName.trim(),
        deviceInfo: input.deviceInfo,
        expiresAt,
      },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            slug: true,
            address: true,
            phone: true,
            shopSettings: true,
          },
        },
      },
    });

    return session;
  }

  async getSession(token: string) {
    const session = await this.prisma.customerSession.findUnique({
      where: { sessionToken: token },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            shopSettings: true,
          },
        },
        printJobs: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!session) throw new NotFoundException('Customer session expired or invalid.');
    return session;
  }

  async getShopSessions(shopId: string, limit = 50) {
    return this.prisma.customerSession.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        _count: {
          select: { printJobs: true },
        },
      },
    });
  }

  async getPlatformSessions(limit = 100) {
    return this.prisma.customerSession.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        shop: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { printJobs: true },
        },
      },
    });
  }
}
