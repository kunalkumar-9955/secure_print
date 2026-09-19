import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { AuditService } from '../audit/audit.service';
import { AgentPairInput, AgentHeartbeatInput } from '@secureprint/validation';
import { AgentStatus, PrinterStatus, PrintAttemptStatus, JobStatus } from '@secureprint/shared-types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AgentsService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
    private auditService: AuditService,
  ) {}

  async generatePairingCode(shopId: string, actorId?: string, actorRole?: string) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    // Store temporary code on an agent placeholder or active record
    const agent = await this.prisma.desktopAgent.create({
      data: {
        shopId,
        installationId: `temp-${uuidv4()}`,
        machineName: 'Pending Connection...',
        agentVersion: '1.0.0',
        status: AgentStatus.CONNECTING,
        pairingCode: code,
        pairingCodeExpiresAt: expiresAt,
      },
    });

    await this.auditService.log({
      actorId,
      actorRole,
      shopId,
      action: 'AGENT_PAIRING_CODE_GENERATED',
      entity: 'DESKTOP_AGENT',
      entityId: agent.id,
      metadata: { code, expiresAt: expiresAt.toISOString() },
    });

    return {
      pairingCode: code,
      expiresAt,
    };
  }

  async pairAgent(input: AgentPairInput) {
    const now = new Date();

    const pendingRecord = await this.prisma.desktopAgent.findFirst({
      where: {
        pairingCode: input.pairingCode,
        pairingCodeExpiresAt: { gt: now },
      },
      include: { shop: true },
    });

    if (!pendingRecord) {
      throw new BadRequestException('Pairing code is invalid or has expired.');
    }

    const pairingToken = uuidv4();

    // Check if an agent record with this installationId already exists
    const existingAgent = await this.prisma.desktopAgent.findUnique({
      where: { installationId: input.installationId },
    });

    let agent;

    if (existingAgent) {
      // Re-pairing existing installation: update shopId, token and details
      agent = await this.prisma.desktopAgent.update({
        where: { installationId: input.installationId },
        data: {
          shopId: pendingRecord.shopId,
          machineName: input.machineName,
          osVersion: input.osVersion,
          agentVersion: input.agentVersion,
          status: AgentStatus.ONLINE,
          pairingToken,
          pairingCode: null,
          pairingCodeExpiresAt: null,
          pairedAt: now,
          lastHeartbeatAt: now,
        },
      });

      // Remove the temporary placeholder
      await this.prisma.desktopAgent.delete({ where: { id: pendingRecord.id } });
    } else {
      // First time installation: update the placeholder with actual installationId
      agent = await this.prisma.desktopAgent.update({
        where: { id: pendingRecord.id },
        data: {
          installationId: input.installationId,
          machineName: input.machineName,
          osVersion: input.osVersion,
          agentVersion: input.agentVersion,
          status: AgentStatus.ONLINE,
          pairingToken,
          pairingCode: null,
          pairingCodeExpiresAt: null,
          pairedAt: now,
          lastHeartbeatAt: now,
        },
      });
    }

    this.realtime.emitAgentUpdate(agent.shopId, {
      agentId: agent.id,
      machineName: agent.machineName,
      status: AgentStatus.ONLINE,
    });

    await this.auditService.log({
      shopId: agent.shopId,
      action: 'AGENT_PAIRED',
      entity: 'DESKTOP_AGENT',
      entityId: agent.id,
      metadata: { machineName: agent.machineName, installationId: input.installationId },
    });

    return {
      pairingToken,
      shopId: pendingRecord.shopId,
      shopName: pendingRecord.shop.name,
      agentId: agent.id,
    };
  }

  async heartbeat(input: AgentHeartbeatInput) {
    const agent = await this.prisma.desktopAgent.findUnique({
      where: { installationId: input.installationId },
    });

    if (!agent) {
      throw new UnauthorizedException('Agent installation not recognized.');
    }

    const updated = await this.prisma.desktopAgent.update({
      where: { id: agent.id },
      data: {
        status: AgentStatus.ONLINE,
        lastHeartbeatAt: new Date(),
        agentVersion: input.agentVersion || agent.agentVersion,
      },
    });

    this.realtime.emitAgentUpdate(agent.shopId, {
      agentId: agent.id,
      status: AgentStatus.ONLINE,
      lastHeartbeatAt: updated.lastHeartbeatAt,
    });

    return { success: true };
  }

  async getShopAgents(shopId: string) {
    const agents = await this.prisma.desktopAgent.findMany({
      where: {
        shopId,
        pairingCode: null, // Only paired agents
      },
      include: {
        printers: true,
        _count: { select: { printAttempts: true } },
      },
      orderBy: { lastHeartbeatAt: 'desc' },
    });

    // Check heartbeat threshold: if > 45s, mark OFFLINE in memory
    const threshold = new Date(Date.now() - 45000);
    return agents.map((a) => {
      const isOnline = a.lastHeartbeatAt && a.lastHeartbeatAt > threshold;
      return {
        ...a,
        status: isOnline ? AgentStatus.ONLINE : AgentStatus.OFFLINE,
      };
    });
  }

  async syncPrinters(agentToken: string, printers: any[]) {
    const agent = await this.prisma.desktopAgent.findFirst({
      where: { pairingToken: agentToken },
    });
    if (!agent) throw new UnauthorizedException('Invalid agent token.');

    let synced = 0;
    for (const p of printers) {
      // Guard: skip printers with missing or empty windowsPrinterName
      const printerName: string | undefined = p.windowsPrinterName || p.WindowsPrinterName;
      if (!printerName || printerName.trim() === '') {
        continue;
      }
      await this.prisma.printer.upsert({
        where: {
          shopId_windowsPrinterName: {
            shopId: agent.shopId,
            windowsPrinterName: printerName,
          },
        },
        update: {
          agentId: agent.id,
          driverName: p.driverName || p.DriverName || null,
          status: (p.status || p.Status || PrinterStatus.READY) as PrinterStatus,
          capabilitiesJson: p.capabilities || p.Capabilities || {},
          isDefault: p.isDefault ?? p.IsDefault ?? false,
          lastSeenAt: new Date(),
        },
        create: {
          shopId: agent.shopId,
          agentId: agent.id,
          windowsPrinterName: printerName,
          driverName: p.driverName || p.DriverName || null,
          status: (p.status || p.Status || PrinterStatus.READY) as PrinterStatus,
          capabilitiesJson: p.capabilities || p.Capabilities || {},
          isDefault: p.isDefault ?? p.IsDefault ?? false,
        },
      });
      synced++;
    }

    return { count: synced };
  }

  async getPendingJobsForAgent(agentToken: string) {
    const agent = await this.prisma.desktopAgent.findFirst({
      where: { pairingToken: agentToken },
    });
    if (!agent) throw new UnauthorizedException('Invalid agent token.');

    const attempts = await this.prisma.printAttempt.findMany({
      where: {
        job: { shopId: agent.shopId, status: JobStatus.PRINTING },
        status: PrintAttemptStatus.SUBMITTED,
        OR: [{ agentId: agent.id }, { agentId: null }],
      },
      include: {
        job: {
          include: { files: true },
        },
        printer: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return attempts.map((att) => {
      const opts = (att.job.printOptionsJson as any) || {};
      const file = att.job.files[0];
      return {
        attemptId: att.id,
        jobId: att.jobId,
        jobCode: att.job.jobCode,
        printerName: att.printer?.windowsPrinterName || 'Default',
        colorMode: opts.colorMode || 'BW',
        copies: Number(opts.copies) || 1,
        paperSize: opts.paperSize || 'A4',
        duplex: opts.duplex || 'NONE',
        fileId: file?.id,
        fileName: file?.originalName || 'document.pdf',
        fileMimeType: file?.mimeType || 'application/pdf',
        fileDownloadUrl: file ? `/api/v1/jobs/${att.jobId}/file/${file.id}` : null,
      };
    });
  }

  async updateAttemptStatus(attemptId: string, status: PrintAttemptStatus, errorMessage?: string) {
    const attempt = await this.prisma.printAttempt.update({
      where: { id: attemptId },
      data: {
        status,
        errorMessage,
        completedAt: status === PrintAttemptStatus.COMPLETED ? new Date() : undefined,
      },
      include: { job: true },
    });

    if (status === PrintAttemptStatus.COMPLETED) {
      await this.prisma.printJob.update({
        where: { id: attempt.jobId },
        data: {
          status: JobStatus.PRINTING_COMPLETED,
          printingCompleted: true,
        },
      });

      this.realtime.emitJobUpdate(attempt.jobId, attempt.job.shopId, {
        jobId: attempt.jobId,
        status: JobStatus.PRINTING_COMPLETED,
        printingCompleted: true,
      });
    } else if (status === PrintAttemptStatus.FAILED) {
      await this.prisma.printJob.update({
        where: { id: attempt.jobId },
        data: { status: JobStatus.PRINT_FAILED },
      });

      this.realtime.emitJobUpdate(attempt.jobId, attempt.job.shopId, {
        jobId: attempt.jobId,
        status: JobStatus.PRINT_FAILED,
        errorMessage,
      });
    }

    return attempt;
  }

  async checkPairingStatus(shopId: string, code: string) {
    const now = new Date();
    const pending = await this.prisma.desktopAgent.findFirst({
      where: {
        shopId,
        pairingCode: code,
      },
    });

    if (pending) {
      if (pending.pairingCodeExpiresAt && pending.pairingCodeExpiresAt < now) {
        return { status: 'EXPIRED' };
      }
      return { status: 'WAITING' };
    }

    // If code is no longer pending, check if an agent was paired recently for this shop
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const pairedAgent = await this.prisma.desktopAgent.findFirst({
      where: {
        shopId,
        pairingCode: null,
        pairedAt: { gte: fiveMinutesAgo },
      },
      include: { printers: true },
      orderBy: { pairedAt: 'desc' },
    });

    if (pairedAgent) {
      return {
        status: 'CONNECTED',
        agent: {
          id: pairedAgent.id,
          machineName: pairedAgent.machineName,
          status: pairedAgent.status,
          printersCount: pairedAgent.printers?.length || 0,
          pairedAt: pairedAgent.pairedAt,
        },
      };
    }

    return { status: 'EXPIRED' };
  }
}
