import { Controller, Post, Get, Patch, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ShopsService } from './shops.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ShopAccessGuard } from '../../common/guards/shop-access.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, ShopStatus } from '@secureprint/shared-types';
import { CreateShopSchema, CreateShopInput, ShopPricingRulesSchema, ShopPricingRulesInput } from '@secureprint/validation';

@Controller('api/v1/shops')
export class ShopsController {
  constructor(private shopsService: ShopsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async createShop(@Body() body: CreateShopInput, @CurrentUser() user: any) {
    const validated = CreateShopSchema.parse(body);
    const result = await this.shopsService.createShop(validated, user.id, user.role);
    return {
      success: true,
      data: result,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async getAllShops() {
    const shops = await this.shopsService.getAllShops();
    return {
      success: true,
      data: shops,
    };
  }

  @Get('shopkeepers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async getShopkeepers() {
    const shopkeepers = await this.shopsService.getAllShopkeepers();
    return {
      success: true,
      data: shopkeepers,
    };
  }

  @Get('public/:slug')
  async getPublicShop(@Param('slug') slug: string) {
    const shop = await this.shopsService.getPublicShopBySlug(slug);
    return {
      success: true,
      data: shop,
    };
  }

  @Get(':shopId')
  @UseGuards(JwtAuthGuard, ShopAccessGuard)
  async getShop(@Param('shopId') shopId: string) {
    const shop = await this.shopsService.getShopById(shopId);
    return {
      success: true,
      data: shop,
    };
  }

  @Patch(':shopId/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async updateStatus(
    @Param('shopId') shopId: string,
    @Body('status') status: ShopStatus,
    @CurrentUser() user: any,
  ) {
    const shop = await this.shopsService.updateShopStatus(shopId, status, user.id, user.role);
    return {
      success: true,
      data: shop,
    };
  }

  @Patch(':shopId/settings')
  @UseGuards(JwtAuthGuard, ShopAccessGuard)
  async updateSettings(
    @Param('shopId') shopId: string,
    @Body('pricingRules') pricingRules: ShopPricingRulesInput,
    @Body('autoPrintEnabled') autoPrint: boolean,
    @Body('cashAccepted') cashAccepted: boolean,
  ) {
    const validatedPricing = pricingRules ? ShopPricingRulesSchema.parse(pricingRules) : undefined;
    const settings = await this.shopsService.updateSettings(shopId, validatedPricing, autoPrint, cashAccepted);
    return {
      success: true,
      data: settings,
    };
  }

  @Get(':shopId/qr')
  @UseGuards(JwtAuthGuard, ShopAccessGuard)
  async getQr(@Param('shopId') shopId: string, @Query('baseUrl') baseUrl?: string) {
    const qr = await this.shopsService.getPermanentQr(shopId, baseUrl);
    return {
      success: true,
      data: qr,
    };
  }
}
