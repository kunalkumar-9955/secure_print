import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ShopAccessGuard } from '../../common/guards/shop-access.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@secureprint/shared-types';

@Controller('api/v1/audit-logs')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get('platform')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async getPlatformLogs(@Query('limit') limit?: string) {
    const logs = await this.auditService.getRecentLogs(undefined, limit ? parseInt(limit, 10) : 50);
    return {
      success: true,
      data: logs,
    };
  }

  @Get('shop/:shopId')
  @UseGuards(JwtAuthGuard, ShopAccessGuard)
  async getShopLogs(@Param('shopId') shopId: string, @Query('limit') limit?: string) {
    const logs = await this.auditService.getRecentLogs(shopId, limit ? parseInt(limit, 10) : 50);
    return {
      success: true,
      data: logs,
    };
  }
}
