import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ShopStatus, PaymentStatus, JobStatus, AgentStatus, PrinterStatus } from '@secureprint/shared-types';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  async getSuperAdminMetrics() {
    try {
      const [
        totalShops,
        activeShops,
        pendingShops,
        suspendedShops,
        activeSubscriptions,
        subPayments,
        customerPayments,
        totalJobs,
        deletedFiles,
        onlineAgents,
        readyPrinters,
      ] = await Promise.all([
        this.prisma.shop.count().catch((err) => { this.logger.warn('totalShops count failed', err); return 0; }),
        this.prisma.shop.count({ where: { status: ShopStatus.ACTIVE } }).catch(() => 0),
        this.prisma.shop.count({ where: { status: ShopStatus.PENDING_PAYMENT } }).catch(() => 0),
        this.prisma.shop.count({ where: { status: ShopStatus.SUSPENDED } }).catch(() => 0),
        this.prisma.subscription.count({ where: { status: 'ACTIVE' } }).catch(() => 0),
        this.prisma.subscriptionPayment.aggregate({
          where: { status: PaymentStatus.SUCCESS },
          _sum: { amount: true },
        }).catch(() => ({ _sum: { amount: null } })),
        this.prisma.payment.aggregate({
          where: { status: PaymentStatus.SUCCESS },
          _sum: { amount: true },
        }).catch(() => ({ _sum: { amount: null } })),
        this.prisma.printJob.count().catch(() => 0),
        this.prisma.printJobFile.count({ where: { isDeleted: true } }).catch(() => 0),
        this.prisma.desktopAgent.count({ where: { status: AgentStatus.ONLINE } }).catch(() => 0),
        this.prisma.printer.count({ where: { status: PrinterStatus.READY } }).catch(() => 0),
      ]);

      const saasRevenue = Number(subPayments._sum?.amount || 0);
      const customerGmv = Number(customerPayments._sum?.amount || 0);

      return {
        shops: {
          total: totalShops,
          active: activeShops,
          pending: pendingShops,
          suspended: suspendedShops,
        },
        revenue: {
          saasSubscriptionRevenue: saasRevenue,
          customerPrintGmv: customerGmv,
          currency: 'INR',
        },
        subscriptions: {
          active: activeSubscriptions,
        },
        operations: {
          totalJobs,
          filesDeleted: deletedFiles,
          onlineAgents,
          readyPrinters,
        },
      };
    } catch (err: any) {
      this.logger.error('Failed to compute super admin platform metrics', err);
      return {
        shops: { total: 0, active: 0, pending: 0, suspended: 0 },
        revenue: { saasSubscriptionRevenue: 0, customerPrintGmv: 0, currency: 'INR' },
        subscriptions: { active: 0 },
        operations: { totalJobs: 0, filesDeleted: 0, onlineAgents: 0, readyPrinters: 0 },
      };
    }
  }

  async getShopSummary(shopId: string) {
    // Calculate start of today in Asia/Kolkata (UTC +5:30)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    istNow.setUTCHours(0, 0, 0, 0);
    const startOfTodayUtc = new Date(istNow.getTime() - istOffset);

    const [
      todayJobs,
      printingJobs,
      waitingPaymentJobs,
      completedJobs,
      todayRevenueAgg,
      agents,
      printers,
    ] = await Promise.all([
      this.prisma.printJob.count({
        where: { shopId, createdAt: { gte: startOfTodayUtc } },
      }),
      this.prisma.printJob.count({
        where: { shopId, status: JobStatus.PRINTING },
      }),
      this.prisma.printJob.count({
        where: { shopId, status: JobStatus.AWAITING_PAYMENT },
      }),
      this.prisma.printJob.count({
        where: {
          shopId,
          status: { in: [JobStatus.PAYMENT_SUCCESS, JobStatus.FILES_DELETED, JobStatus.JOB_CLOSED] },
        },
      }),
      this.prisma.payment.aggregate({
        where: {
          shopId,
          status: PaymentStatus.SUCCESS,
          verifiedAt: { gte: startOfTodayUtc },
        },
        _sum: { amount: true },
      }),
      this.prisma.desktopAgent.findMany({
        where: { shopId },
        select: { status: true, lastHeartbeatAt: true },
      }),
      this.prisma.printer.count({
        where: { shopId, status: PrinterStatus.READY },
      }),
    ]);

    const threshold = new Date(Date.now() - 45000);
    const onlineAgentsCount = agents.filter(
      (a) => a.lastHeartbeatAt && a.lastHeartbeatAt > threshold,
    ).length;

    return {
      todayJobs,
      printingJobs,
      waitingPaymentJobs,
      completedJobs,
      todayRevenue: Number(todayRevenueAgg._sum.amount || 0),
      currency: 'INR',
      onlineAgents: onlineAgentsCount,
      readyPrinters: printers,
      timezone: 'Asia/Kolkata',
    };
  }
}
