import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AgentsService } from '../src/modules/agents/agents.service';
import { JobsService } from '../src/modules/jobs/jobs.service';
import { AgentStatus, JobStatus, PrinterStatus, PrintAttemptStatus } from '@secureprint/shared-types';

describe('Tenant Isolation & Print Guard Verification', () => {
  describe('AgentsService Tenant Isolation', () => {
    let service: AgentsService;
    let mockPrisma: any;
    let mockRealtime: any;
    let mockAudit: any;

    beforeEach(() => {
      mockPrisma = {
        desktopAgent: {
          findFirst: jest.fn(),
          findMany: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        },
        printAttempt: {
          findMany: jest.fn(),
          update: jest.fn(),
        },
        printJob: {
          update: jest.fn(),
        },
      };

      mockRealtime = {
        emitAgentUpdate: jest.fn(),
        emitJobUpdate: jest.fn(),
      };

      mockAudit = {
        log: jest.fn().mockResolvedValue(undefined),
      };

      service = new AgentsService(mockPrisma, mockRealtime, mockAudit);
    });

    it('ensures an agent only queries and retrieves jobs for its own assigned shopId', async () => {
      const agentShopA = {
        id: 'agent-shop-a',
        shopId: 'shop-a',
        pairingToken: 'token-a',
        status: AgentStatus.ONLINE,
      };

      mockPrisma.desktopAgent.findFirst.mockResolvedValue(agentShopA);
      mockPrisma.printAttempt.findMany.mockImplementation(async (args: any) => {
        // Verify that the database query strictly isolates by shopId
        expect(args.where.job.shopId).toBe('shop-a');
        expect(args.where.job.status).toBe(JobStatus.PRINTING);
        expect(args.where.status).toBe(PrintAttemptStatus.SUBMITTED);

        // Return a mock attempt belonging to shop-a
        return [
          {
            id: 'attempt-1',
            jobId: 'job-1',
            job: {
              jobCode: 'SP-1001',
              shopId: 'shop-a',
              printOptionsJson: { copies: 1, colorMode: 'BW' },
              files: [{ id: 'file-1', originalName: 'doc.pdf', mimeType: 'application/pdf' }],
            },
            printer: { windowsPrinterName: 'HP LaserJet' },
          },
        ];
      });

      const jobs = await service.getPendingJobsForAgent('token-a');

      expect(jobs).toHaveLength(1);
      expect(jobs[0].jobId).toBe('job-1');
      expect(jobs[0].jobCode).toBe('SP-1001');
      expect(mockPrisma.printAttempt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            job: expect.objectContaining({ shopId: 'shop-a' }),
          }),
        }),
      );
    });

    it('rejects pending jobs query if agent token is invalid', async () => {
      mockPrisma.desktopAgent.findFirst.mockResolvedValue(null);

      await expect(service.getPendingJobsForAgent('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('JobsService Print Dispatch Guards', () => {
    let service: JobsService;
    let mockPrisma: any;
    let mockStorage: any;
    let mockPricing: any;
    let mockRealtime: any;
    let mockAudit: any;

    beforeEach(() => {
      mockPrisma = {
        printJob: {
          findUnique: jest.fn(),
          update: jest.fn(),
        },
        desktopAgent: {
          findFirst: jest.fn(),
        },
        printer: {
          findFirst: jest.fn(),
        },
        printAttempt: {
          create: jest.fn(),
        },
      };

      mockStorage = {};
      mockPricing = {};
      mockRealtime = { emitJobUpdate: jest.fn() };
      mockAudit = { log: jest.fn().mockResolvedValue(undefined) };

      service = new JobsService(mockPrisma, mockStorage, mockPricing, mockRealtime, mockAudit);
    });

    it('rejects print dispatch when no online Desktop Agent is connected with "Desktop Agent is offline."', async () => {
      mockPrisma.printJob.findUnique.mockResolvedValue({
        id: 'job-1',
        shopId: 'shop-a',
        status: JobStatus.REQUEST_SENT,
        files: [],
      });

      // No agent found online within threshold
      mockPrisma.desktopAgent.findFirst.mockResolvedValue(null);

      await expect(service.submitToAgent('job-1')).rejects.toThrow(
        new BadRequestException('Desktop Agent is offline.'),
      );
    });

    it('rejects print dispatch when target printer does not belong to the job shop with "Printer is unavailable."', async () => {
      mockPrisma.printJob.findUnique.mockResolvedValue({
        id: 'job-1',
        shopId: 'shop-a',
        status: JobStatus.REQUEST_SENT,
        files: [],
      });

      mockPrisma.desktopAgent.findFirst.mockResolvedValue({
        id: 'agent-1',
        shopId: 'shop-a',
        status: AgentStatus.ONLINE,
        lastHeartbeatAt: new Date(),
        printers: [],
      });

      // Target printer belongs to shop-b, so searching with { id: 'printer-foreign', shopId: 'shop-a' } returns null
      mockPrisma.printer.findFirst.mockResolvedValue(null);

      await expect(service.submitToAgent('job-1', 'printer-foreign')).rejects.toThrow(
        new BadRequestException('Printer is unavailable.'),
      );
    });

    it('rejects print dispatch when target printer status is OFFLINE or ERROR with "Printer is unavailable."', async () => {
      mockPrisma.printJob.findUnique.mockResolvedValue({
        id: 'job-1',
        shopId: 'shop-a',
        status: JobStatus.REQUEST_SENT,
        files: [],
      });

      mockPrisma.desktopAgent.findFirst.mockResolvedValue({
        id: 'agent-1',
        shopId: 'shop-a',
        status: AgentStatus.ONLINE,
        lastHeartbeatAt: new Date(),
        printers: [],
      });

      mockPrisma.printer.findFirst.mockResolvedValue({
        id: 'printer-offline',
        shopId: 'shop-a',
        status: PrinterStatus.OFFLINE,
      });

      await expect(service.submitToAgent('job-1', 'printer-offline')).rejects.toThrow(
        new BadRequestException('Printer is unavailable.'),
      );
    });

    it('prevents duplicate printing if the job is already in PRINTING or completed state', async () => {
      mockPrisma.printJob.findUnique.mockResolvedValue({
        id: 'job-1',
        shopId: 'shop-a',
        status: JobStatus.PRINTING,
        files: [],
      });

      await expect(service.submitToAgent('job-1')).rejects.toThrow(
        /Duplicate print dispatch is not permitted/,
      );
    });
  });
});
