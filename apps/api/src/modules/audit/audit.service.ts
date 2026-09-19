import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface AuditParams {
  actorId?: string;
  actorRole?: string;
  shopId?: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async log(params: AuditParams): Promise<void> {
    try {
      // Sanitize metadata to avoid saving passwords, tokens, or secret keys
      const sanitizedMetadata = this.sanitize(params.metadata);

      await this.prisma.auditLog.create({
        data: {
          actorId: params.actorId,
          actorRole: params.actorRole,
          shopId: params.shopId,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
          metadataJson: sanitizedMetadata,
          ipAddress: params.ipAddress,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to write audit log for action: ${params.action}`, err);
    }
  }

  async getRecentLogs(shopId?: string, limit = 50) {
    return this.prisma.auditLog.findMany({
      where: shopId ? { shopId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { name: true, email: true } },
        shop: { select: { name: true, slug: true } },
      },
    });
  }

  private sanitize(meta?: Record<string, any>): Record<string, any> | undefined {
    if (!meta) return undefined;
    const sanitized: Record<string, any> = {};
    const sensitiveKeys = ['password', 'secret', 'token', 'key', 'auth', 'hash', 'signature'];

    for (const [k, v] of Object.entries(meta)) {
      if (sensitiveKeys.some((s) => k.toLowerCase().includes(s))) {
        sanitized[k] = '[REDACTED]';
      } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        sanitized[k] = this.sanitize(v);
      } else {
        sanitized[k] = v;
      }
    }
    return sanitized;
  }
}
