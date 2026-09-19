import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ShopAccessGuard } from '../../common/guards/shop-access.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, SubscriptionInterval } from '@secureprint/shared-types';

@Controller('api/v1/subscriptions')
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  async getPlans() {
    const plans = await this.subscriptionsService.getPlans();
    return {
      success: true,
      data: plans,
    };
  }

  @Post('plans')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async createPlan(
    @Body()
    body: {
      name: string;
      tier: string;
      price: number;
      interval: SubscriptionInterval;
      features: string[];
      limits: Record<string, any>;
    },
  ) {
    const plan = await this.subscriptionsService.createPlan(body);
    return {
      success: true,
      data: plan,
    };
  }

  @Get('platform')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async getPlatformSubscriptions() {
    const subs = await this.subscriptionsService.getPlatformSubscriptions();
    return {
      success: true,
      data: subs,
    };
  }

  @Get('shop/:shopId')
  @UseGuards(JwtAuthGuard, ShopAccessGuard)
  async getShopSubscription(@Param('shopId') shopId: string) {
    const sub = await this.subscriptionsService.getShopSubscription(shopId);
    return {
      success: true,
      data: sub,
    };
  }

  @Post('shop/:shopId/activate')
  @UseGuards(JwtAuthGuard, ShopAccessGuard)
  async activate(
    @Param('shopId') shopId: string,
    @Body('planId') planId: string,
    @Body('providerRef') providerRef: string,
    @CurrentUser() user: any,
  ) {
    const sub = await this.subscriptionsService.activateSubscription(
      shopId,
      planId,
      providerRef,
      user.id,
      user.role,
    );
    return {
      success: true,
      data: sub,
    };
  }
}
