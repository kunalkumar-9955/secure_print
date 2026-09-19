import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ShopAccessGuard } from '../../common/guards/shop-access.guard';
import { PrintCompletedGuard } from '../../common/guards/print-completed.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreatePaymentOrderSchema, ConfirmCashPaymentSchema } from '@secureprint/validation';

@Controller('api/v1/payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('create-order')
  @UseGuards(PrintCompletedGuard)
  async createOrder(@Body('jobId') jobId: string) {
    CreatePaymentOrderSchema.parse({ jobId });
    const order = await this.paymentsService.createOnlineOrder(jobId);
    return {
      success: true,
      data: order,
    };
  }

  @Post('verify')
  async verifyOrder(
    @Body('jobId') jobId: string,
    @Body('providerOrderId') providerOrderId: string,
  ) {
    const result = await this.paymentsService.verifyPayment(jobId, providerOrderId);
    return {
      success: true,
      data: result,
    };
  }

  @Post('request-cash')
  async requestCash(@Body('jobId') jobId: string) {
    const result = await this.paymentsService.requestCashPayment(jobId);
    return {
      success: true,
      data: result,
    };
  }

  @Post('confirm-cash')
  @UseGuards(JwtAuthGuard, ShopAccessGuard)
  async confirmCash(@Body('jobId') jobId: string, @CurrentUser() user: any) {
    ConfirmCashPaymentSchema.parse({ jobId });
    const result = await this.paymentsService.confirmCashPayment(jobId, user.id, user.role);
    return {
      success: true,
      data: result,
    };
  }

  @Get('shop/:shopId')
  @UseGuards(JwtAuthGuard, ShopAccessGuard)
  async getShopPayments(@Param('shopId') shopId: string) {
    const payments = await this.paymentsService.getShopPayments(shopId);
    return {
      success: true,
      data: payments,
    };
  }

  @Get('platform')
  @UseGuards(JwtAuthGuard)
  async getPlatformPayments() {
    const payments = await this.paymentsService.getPlatformPayments();
    return {
      success: true,
      data: payments,
    };
  }
}
