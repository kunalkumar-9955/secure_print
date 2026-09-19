import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@secureprint/shared-types';

@Injectable()
export class ShopAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User authentication required.');
    }

    const userRole = user?.role?.toString().trim().toUpperCase();
    if (userRole === UserRole.SUPER_ADMIN) {
      return true;
    }

    const targetShopId = request.params.shopId || request.query.shopId || request.body?.shopId;
    if (targetShopId && user.shopId !== targetShopId) {
      throw new ForbiddenException('Tenant isolation violation: You do not have access to this shop.');
    }

    return true;
  }
}
