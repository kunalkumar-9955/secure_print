import { Controller, Get, Post, Patch, Delete, Param, UseGuards } from '@nestjs/common';
import { PrintersService } from './printers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ShopAccessGuard } from '../../common/guards/shop-access.guard';
import { SubscriptionActiveGuard } from '../../common/guards/subscription-active.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/v1/printers')
export class PrintersController {
  constructor(private printersService: PrintersService) {}

  @Get('shop/:shopId')
  @UseGuards(JwtAuthGuard, ShopAccessGuard, SubscriptionActiveGuard)
  async getPrinters(@Param('shopId') shopId: string) {
    const printers = await this.printersService.getShopPrinters(shopId);
    return {
      success: true,
      data: printers,
    };
  }

  @Patch(':printerId/default')
  @UseGuards(JwtAuthGuard, SubscriptionActiveGuard)
  async setDefault(@Param('printerId') printerId: string, @CurrentUser() user: any) {
    const result = await this.printersService.setDefaultPrinter(printerId, user.shopId);
    return {
      success: true,
      data: result,
    };
  }

  @Delete(':printerId')
  @UseGuards(JwtAuthGuard, SubscriptionActiveGuard)
  async deletePrinter(@Param('printerId') printerId: string, @CurrentUser() user: any) {
    const result = await this.printersService.deletePrinter(printerId, user.shopId);
    return {
      success: true,
      data: result,
    };
  }

  @Post(':printerId/test-print')
  @UseGuards(JwtAuthGuard, SubscriptionActiveGuard)
  async testPrint(@Param('printerId') printerId: string, @CurrentUser() user: any) {
    const result = await this.printersService.triggerTestPrint(printerId, user.id, user.role);
    return {
      success: true,
      data: result,
    };
  }
}
