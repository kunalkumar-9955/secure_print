import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ShopStatus, UserRole } from '@secureprint/shared-types';

@Injectable()
export class SubscriptionActiveGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Super Admins bypass subscription operational restrictions
    const userRole = user?.role?.toString().trim().toUpperCase();
    if (userRole === UserRole.SUPER_ADMIN) {
      return true;
    }

    const shopId = request.params.shopId || user?.shopId || request.body?.shopId;
    if (!shopId) {
      return true;
    }

    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { status: true, name: true },
    });

    if (!shop) {
      throw new ForbiddenException('Shop not found.');
    }

    if (shop.status === ShopStatus.PENDING_PAYMENT) {
      throw new ForbiddenException(
        'Operational features (print queue, printers, agent pairing, live printing) are locked until the SaaS subscription payment is verified.',
      );
    }

    if (shop.status === ShopStatus.SUSPENDED) {
      throw new ForbiddenException('This shop account is currently suspended. Please contact platform support.');
    }

    if (shop.status === ShopStatus.DISABLED) {
      throw new ForbiddenException('This shop account has been disabled.');
    }

    return true;
  }
}
