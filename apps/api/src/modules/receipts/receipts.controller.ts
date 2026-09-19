import { Controller, Get, Param } from '@nestjs/common';
import { ReceiptsService } from './receipts.service';

@Controller('api/v1/receipts')
export class ReceiptsController {
  constructor(private receiptsService: ReceiptsService) {}

  @Get('job/:jobId')
  async getReceipt(@Param('jobId') jobId: string) {
    const receipt = await this.receiptsService.getReceiptByJobId(jobId);
    return {
      success: true,
      data: receipt,
    };
  }
}
