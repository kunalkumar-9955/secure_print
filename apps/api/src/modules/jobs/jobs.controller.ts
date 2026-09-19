import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JobsService } from './jobs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ShopAccessGuard } from '../../common/guards/shop-access.guard';
import { SubscriptionActiveGuard } from '../../common/guards/subscription-active.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrintOptionsSchema } from '@secureprint/validation';
import { Response } from 'express';

@Controller('api/v1/jobs')
export class JobsController {
  constructor(private jobsService: JobsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
      fileFilter: (req, file, cb) => {
        const allowedMimes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only PDF and safe image files (PNG, JPG) are supported.'), false);
        }
      },
    }),
  )
  async createJob(
    @UploadedFile() file: Express.Multer.File,
    @Body('sessionId') sessionId: string,
    @Body('options') optionsRaw: string,
    @Body('pageCount') pageCountRaw?: string,
  ) {
    if (!file) throw new BadRequestException('A document file is required.');
    if (!sessionId) throw new BadRequestException('Customer session ID is required.');

    let parsedOptions;
    try {
      parsedOptions = typeof optionsRaw === 'string' ? JSON.parse(optionsRaw) : optionsRaw;
    } catch {
      throw new BadRequestException('Invalid options JSON.');
    }

    const validatedOptions = PrintOptionsSchema.parse(parsedOptions);
    const pageCount = pageCountRaw ? parseInt(pageCountRaw, 10) : 1;

    const job = await this.jobsService.createJob(sessionId, file, validatedOptions, pageCount);
    return {
      success: true,
      data: job,
    };
  }

  @Get(':jobId')
  async getJob(@Param('jobId') jobId: string) {
    const job = await this.jobsService.getJobById(jobId);
    return {
      success: true,
      data: job,
    };
  }

  @Patch(':jobId/options')
  async updateOptions(
    @Param('jobId') jobId: string,
    @Body() body: any,
  ) {
    const rawOptions = body?.options || body;
    let parsedOptions;
    try {
      parsedOptions = typeof rawOptions === 'string' ? JSON.parse(rawOptions) : rawOptions;
    } catch {
      throw new BadRequestException('Invalid options JSON payload.');
    }
    const validated = PrintOptionsSchema.parse(parsedOptions);
    const updated = await this.jobsService.updateJobOptions(jobId, validated);
    return {
      success: true,
      data: updated,
    };
  }

  @Get('shop/:shopId')
  @UseGuards(JwtAuthGuard, ShopAccessGuard, SubscriptionActiveGuard)
  async getShopQueue(@Param('shopId') shopId: string) {
    const queue = await this.jobsService.getShopQueue(shopId);
    return {
      success: true,
      data: queue,
    };
  }

  @Get('shop/:shopId/history')
  @UseGuards(JwtAuthGuard, ShopAccessGuard, SubscriptionActiveGuard)
  async getShopHistory(@Param('shopId') shopId: string) {
    const history = await this.jobsService.getShopHistory(shopId);
    return {
      success: true,
      data: history,
    };
  }

  @Post(':jobId/print')
  @UseGuards(JwtAuthGuard, ShopAccessGuard, SubscriptionActiveGuard)
  async submitPrint(
    @Param('jobId') jobId: string,
    @Body('printerId') printerId: string,
    @CurrentUser() user: any,
  ) {
    const attempt = await this.jobsService.submitToAgent(jobId, printerId, user.id, user.role);
    return {
      success: true,
      data: attempt,
    };
  }

  @Post(':jobId/complete-print')
  @UseGuards(JwtAuthGuard, ShopAccessGuard, SubscriptionActiveGuard)
  async completePrint(@Param('jobId') jobId: string, @CurrentUser() user: any) {
    const updated = await this.jobsService.markPrintingCompleted(jobId, user.id, user.role);
    return {
      success: true,
      data: updated,
    };
  }

  @Get(':jobId/file/:fileId')
  async downloadFile(
    @Param('jobId') jobId: string,
    @Param('fileId') fileId: string,
    @Res() res: Response,
  ) {
    const { filePath, originalName, mimeType } = await this.jobsService.getFileForJob(jobId, fileId);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${originalName}"`);
    return res.sendFile(filePath);
  }
}
