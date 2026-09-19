import { Controller, Post, Get, Body, Param, Headers, UnauthorizedException, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { StartCustomerSessionSchema, StartCustomerSessionInput } from '@secureprint/validation';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ShopAccessGuard } from '../../common/guards/shop-access.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@secureprint/shared-types';

@Controller('api/v1/customers')
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Post('start')
  async start(@Body() body: StartCustomerSessionInput) {
    const validated = StartCustomerSessionSchema.parse(body);
    const session = await this.customersService.startSession(validated);
    return {
      success: true,
      data: session,
    };
  }

  @Get('session')
  async getSession(@Headers('x-session-token') token?: string) {
    if (!token) {
      throw new UnauthorizedException('Customer session token missing.');
    }
    const session = await this.customersService.getSession(token);
    return {
      success: true,
      data: session,
    };
  }

  @Get('shop/:shopId')
  @UseGuards(JwtAuthGuard, ShopAccessGuard)
  async getShopSessions(@Param('shopId') shopId: string) {
    const sessions = await this.customersService.getShopSessions(shopId);
    return {
      success: true,
      data: sessions,
    };
  }

  @Get('platform')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async getPlatformSessions() {
    const sessions = await this.customersService.getPlatformSessions();
    return {
      success: true,
      data: sessions,
    };
  }
}
