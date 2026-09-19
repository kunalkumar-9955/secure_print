import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@secureprint/shared-types';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('User authentication required for role verification.');
    }

    const userRole = (user.role || (Array.isArray(user.roles) ? user.roles[0] : ''))
      ?.toString()
      .trim()
      .toUpperCase();

    // SUPER_ADMIN has platform-wide super privileges
    if (
      userRole === UserRole.SUPER_ADMIN ||
      (Array.isArray(user.roles) &&
        user.roles.some((r: any) => r?.toString().trim().toUpperCase() === UserRole.SUPER_ADMIN))
    ) {
      return true;
    }

    const normalizedRequired = requiredRoles.map((r) => r.toString().trim().toUpperCase());
    const hasRole =
      normalizedRequired.includes(userRole) ||
      (Array.isArray(user.roles) &&
        user.roles.some((r: any) => normalizedRequired.includes(r?.toString().trim().toUpperCase())));

    if (!hasRole) {
      throw new ForbiddenException(`Insufficient role permissions. Required: [${requiredRoles.join(', ')}]`);
    }

    return true;
  }
}
