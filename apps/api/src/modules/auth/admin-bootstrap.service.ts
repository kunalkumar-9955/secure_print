import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as bcrypt from 'bcryptjs';
import { UserRole, ShopStatus, SubscriptionInterval, SubscriptionStatus } from '@prisma/client';

@Injectable()
export class AdminBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(private prisma: PrismaService) {}

  async onApplicationBootstrap() {
    try {
      await this.ensureSuperAdmin();
      await this.ensureSubscriptionPlans();
      await this.ensureDemoShopOwner();
    } catch (err: any) {
      this.logger.warn(`[Bootstrap] Non-fatal startup initialization warning: ${err.message}`);
    }
  }

  async ensureSuperAdmin() {
    const adminEmail = (process.env.SUPER_ADMIN_EMAIL || 'admin@secureprint.io').trim().toLowerCase();
    const adminPassword = process.env.SUPER_ADMIN_PASSWORD || 'Admin@123456';
    const forceReset = process.env.RESET_SUPER_ADMIN_PASSWORD === 'true';

    const existingAdmin = await this.prisma.user.findFirst({
      where: { role: UserRole.SUPER_ADMIN },
    });

    if (!existingAdmin || forceReset) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(adminPassword, salt);

      const admin = await this.prisma.user.upsert({
        where: { email: adminEmail },
        update: {
          passwordHash,
          role: UserRole.SUPER_ADMIN,
          isActive: true,
        },
        create: {
          email: adminEmail,
          passwordHash,
          name: 'SecurePrint Platform Admin',
          role: UserRole.SUPER_ADMIN,
          isActive: true,
        },
      });

      this.logger.log(`[AdminBootstrap] Super Admin initialized: ${admin.email} (id: ${admin.id})`);
    } else {
      this.logger.log(`[AdminBootstrap] Super Admin verified in database: ${existingAdmin.email}`);
    }
  }

  async ensureSubscriptionPlans() {
    const planCount = await this.prisma.subscriptionPlan.count();
    if (planCount > 0) return;

    const plans = [
      {
        id: 'plan-starter',
        name: 'Starter Cyber Cafe',
        tier: 'STARTER',
        price: 499.0,
        interval: SubscriptionInterval.MONTHLY,
        featuresJson: ['Up to 2 Desktop Agents', 'Up to 2 Windows Printers', '1,000 Monthly Jobs', 'Automatic 10s Privacy Cleanup', 'Standard Dashboard'],
        limitsJson: { maxAgents: 2, maxPrinters: 2, monthlyJobs: 1000 },
      },
      {
        id: 'plan-pro',
        name: 'Pro Document Center',
        tier: 'PRO',
        price: 999.0,
        interval: SubscriptionInterval.MONTHLY,
        featuresJson: ['Up to 5 Desktop Agents', 'Up to 5 Windows Printers', '5,000 Monthly Jobs', 'Priority Spooling', 'Realtime Queue Alerts', 'Custom Pricing Matrix'],
        limitsJson: { maxAgents: 5, maxPrinters: 5, monthlyJobs: 5000 },
      },
      {
        id: 'plan-enterprise',
        name: 'Enterprise Print Counter',
        tier: 'ENTERPRISE',
        price: 2499.0,
        interval: SubscriptionInterval.MONTHLY,
        featuresJson: ['Unlimited Desktop Agents', 'Unlimited Windows Printers', 'Unlimited Monthly Jobs', 'Dedicated Support', 'Audit Log Export', 'Multi-Counter Cash Handling'],
        limitsJson: { maxAgents: 999, maxPrinters: 999, monthlyJobs: 999999 },
      },
    ];

    for (const p of plans) {
      await this.prisma.subscriptionPlan.upsert({
        where: { id: p.id },
        update: { price: p.price, name: p.name },
        create: p,
      });
    }
    this.logger.log('[AdminBootstrap] Default subscription plans initialized');
  }

  async ensureDemoShopOwner() {
    const shopSlug = 'apex-digital';
    const ownerEmail = (process.env.SHOP_OWNER_EMAIL || 'owner@apexdigital.com').trim().toLowerCase();
    const ownerPassword = process.env.SHOP_OWNER_PASSWORD || 'ShopOwner@123';

    const existingShop = await this.prisma.shop.findUnique({
      where: { slug: shopSlug },
    });

    if (!existingShop) {
      const defaultPricing = {
        ratePerBwPage: 2.0,
        ratePerColorPage: 10.0,
        rateA3Multiplier: 2.0,
        rateLegalMultiplier: 1.2,
        duplexDiscountPercent: 10,
        minimumOrderAmount: 2.0,
        currency: 'INR',
      };

      const shop = await this.prisma.shop.create({
        data: {
          name: 'Apex Digital Prints',
          slug: shopSlug,
          address: 'Shop 14, Commercial Complex, MG Road, Bengaluru',
          phone: '+91 98765 43210',
          status: ShopStatus.ACTIVE,
          shopSettings: {
            create: {
              pricingRulesJson: defaultPricing,
              autoPrintEnabled: false,
              cashAccepted: true,
            },
          },
        },
      });

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(ownerPassword, salt);

      const owner = await this.prisma.user.upsert({
        where: { email: ownerEmail },
        update: { shopId: shop.id, role: UserRole.SHOP_OWNER, isActive: true },
        create: {
          email: ownerEmail,
          passwordHash,
          name: 'Rajesh Sharma',
          role: UserRole.SHOP_OWNER,
          shopId: shop.id,
          isActive: true,
        },
      });

      await this.prisma.shopMember.upsert({
        where: { shopId_userId: { shopId: shop.id, userId: owner.id } },
        update: {},
        create: {
          shopId: shop.id,
          userId: owner.id,
          role: UserRole.SHOP_OWNER,
        },
      });

      const now = new Date();
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const sub = await this.prisma.subscription.create({
        data: {
          shopId: shop.id,
          planId: 'plan-pro',
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: now,
          currentPeriodEnd: nextMonth,
        },
      });

      this.logger.log(`[AdminBootstrap] Shop Owner initialized: ${owner.email} for shop ${shop.slug}`);
    }
  }
}
