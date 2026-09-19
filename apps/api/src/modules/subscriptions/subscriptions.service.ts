import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SubscriptionStatus, ShopStatus, SubscriptionInterval } from '@secureprint/shared-types';

@Injectable()
export class SubscriptionsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async getPlans() {
    return this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });
  }

  async createPlan(data: {
    name: string;
    tier: string;
    price: number;
    interval: SubscriptionInterval;
    features: string[];
    limits: Record<string, any>;
  }) {
    return this.prisma.subscriptionPlan.create({
      data: {
        name: data.name,
        tier: data.tier,
        price: data.price,
        interval: data.interval,
        featuresJson: data.features,
        limitsJson: data.limits,
      },
    });
  }

  async getShopSubscription(shopId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
      include: {
        plan: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });
    return sub;
  }

  async getPlatformSubscriptions() {
    return this.prisma.subscription.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        shop: {
          select: { id: true, name: true, slug: true, status: true },
        },
        plan: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
    });
  }

  async activateSubscription(
    shopId: string,
    planId: string,
    providerRef?: string,
    actorId?: string,
    actorRole?: string,
  ) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });
    if (!plan) throw new NotFoundException('Subscription plan not found.');

    const now = new Date();
    const periodEnd = new Date(now);
    if (plan.interval === SubscriptionInterval.YEARLY) {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    return this.prisma.$transaction(async (tx) => {
      // Create or update subscription
      const subscription = await tx.subscription.create({
        data: {
          shopId,
          planId,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
        include: { plan: true },
      });

      // Record subscription payment
      await tx.subscriptionPayment.create({
        data: {
          shopId,
          subscriptionId: subscription.id,
          amount: plan.price,
          currency: 'INR',
          provider: 'CASHFREE',
          providerRef: providerRef || `SUB_${Date.now()}`,
          status: 'SUCCESS',
        },
      });

      // Unlock shop to ACTIVE
      await tx.shop.update({
        where: { id: shopId },
        data: { status: ShopStatus.ACTIVE },
      });

      await this.auditService.log({
        actorId,
        actorRole,
        shopId,
        action: 'SUBSCRIPTION_ACTIVATED',
        entity: 'SUBSCRIPTION',
        entityId: subscription.id,
        metadata: { planId, planName: plan.name, amount: plan.price.toString() },
      });

      return subscription;
    });
  }
}
