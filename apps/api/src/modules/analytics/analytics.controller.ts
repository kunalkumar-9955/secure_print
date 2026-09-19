import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ShopAccessGuard } from '../../common/guards/shop-access.guard';
import { SubscriptionActiveGuard } from '../../common/guards/subscription-active.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@secureprint/shared-types';

@Controller('api/v1/analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('platform')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async getPlatformMetrics() {
    const data = await this.analyticsService.getSuperAdminMetrics();
    return {
      success: true,
      data,
    };
  }

  @Get('shop/:shopId')
  @UseGuards(JwtAuthGuard, ShopAccessGuard, SubscriptionActiveGuard)
  async getShopSummary(@Param('shopId') shopId: string) {
    const data = await this.analyticsService.getShopSummary(shopId);
    return {
      success: true,
      data,
    };
  }
}
