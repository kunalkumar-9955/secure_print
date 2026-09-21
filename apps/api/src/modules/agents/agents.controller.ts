import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Headers,
  UseGuards,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { AgentsService } from './agents.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ShopAccessGuard } from '../../common/guards/shop-access.guard';
import { SubscriptionActiveGuard } from '../../common/guards/subscription-active.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  AgentPairSchema,
  AgentPairInput,
  AgentHeartbeatSchema,
  AgentHeartbeatInput,
  UpdatePrintAttemptSchema,
  UpdatePrintAttemptInput,
} from '@secureprint/validation';

@Controller('api/v1')
export class AgentsController {
  constructor(private agentsService: AgentsService) {}

  // Desktop Agent Endpoints
  @Post('agent/pair')
  async pair(@Body() body: AgentPairInput) {
    const validated = AgentPairSchema.parse(body);
    const result = await this.agentsService.pairAgent(validated);
    return {
      success: true,
      data: result,
    };
  }

  @Post('agent/heartbeat')
  async heartbeat(@Body() body: AgentHeartbeatInput) {
    const validated = AgentHeartbeatSchema.parse(body);
    const result = await this.agentsService.heartbeat(validated);
    return {
      success: true,
      data: result,
    };
  }

  @Post('agent/printers')
  async syncPrinters(
    @Headers('authorization') authHeader: string,
    @Body('printers') printers: any[],
  ) {
    const token = authHeader?.replace('Bearer ', '');
    if (!token) throw new UnauthorizedException('Agent bearer token required.');
    const result = await this.agentsService.syncPrinters(token, printers || []);
    return {
      success: true,
      data: result,
    };
  }

  @Get('agent/jobs')
  async getPendingJobs(@Headers('authorization') authHeader: string) {
    const token = authHeader?.replace('Bearer ', '');
    if (!token) throw new UnauthorizedException('Agent bearer token required.');
    const jobs = await this.agentsService.getPendingJobsForAgent(token);
    return {
      success: true,
      data: jobs,
    };
  }

  @Post('agent/status')
  async updateStatus(@Body() body: UpdatePrintAttemptInput) {
    const validated = UpdatePrintAttemptSchema.parse(body);
    const attempt = await this.agentsService.updateAttemptStatus(
      validated.attemptId,
      validated.status as any,
      validated.errorMessage,
    );
    return {
      success: true,
      data: attempt,
    };
  }

  // Shopkeeper Web Dashboard Endpoints
  @Post('agents/pairing-code')
  @UseGuards(JwtAuthGuard, ShopAccessGuard, SubscriptionActiveGuard)
  async generateCode(@Body('shopId') shopId: string, @CurrentUser() user: any) {
    const targetShopId = shopId || user?.shopId;
    if (!targetShopId) {
      throw new BadRequestException('Shop ID is required to generate a pairing code.');
    }
    const codeData = await this.agentsService.generatePairingCode(targetShopId, user.id, user.role);
    return {
      success: true,
      data: codeData,
    };
  }

  @Get('agents/shop/:shopId')
  @UseGuards(JwtAuthGuard, ShopAccessGuard, SubscriptionActiveGuard)
  async getShopAgents(@Param('shopId') shopId: string) {
    const agents = await this.agentsService.getShopAgents(shopId);
    return {
      success: true,
      data: agents,
    };
  }

  @Get('agents/pairing-code/status/:code')
  @UseGuards(JwtAuthGuard, ShopAccessGuard, SubscriptionActiveGuard)
  async checkCodeStatus(
    @Param('code') code: string,
    @Query('shopId') shopId: string,
  ) {
    const status = await this.agentsService.checkPairingStatus(shopId, code);
    return {
      success: true,
      data: status,
    };
  }

  @Get('agent/download')
  async downloadAgent(@Res() res: Response) {
    const candidates = [
      path.resolve(process.cwd(), 'apps/api/public/SecurePrint-Windows-Agent.zip'),
      path.resolve(process.cwd(), 'public/SecurePrint-Windows-Agent.zip'),
      path.resolve(__dirname, '../../../../apps/api/public/SecurePrint-Windows-Agent.zip'),
      path.resolve(__dirname, '../../../../public/SecurePrint-Windows-Agent.zip'),
      path.resolve(__dirname, '../../../public/SecurePrint-Windows-Agent.zip'),
      path.resolve(__dirname, '../../public/SecurePrint-Windows-Agent.zip'),
      path.resolve(__dirname, '../public/SecurePrint-Windows-Agent.zip'),
    ];

    const finalPath = candidates.find((p) => fs.existsSync(p));
    if (!finalPath) {
      throw new NotFoundException('SecurePrint Windows Agent package not found on server.');
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="SecurePrint-Windows-Agent.zip"');
    return res.sendFile(finalPath);
  }

  @Delete('agents/:agentId')
  @UseGuards(JwtAuthGuard, ShopAccessGuard, SubscriptionActiveGuard)
  async deleteAgent(@Param('agentId') agentId: string, @CurrentUser() user: any) {
    const result = await this.agentsService.deleteAgent(agentId, user?.shopId, user?.role);
    return {
      success: true,
      data: result,
    };
  }
}
