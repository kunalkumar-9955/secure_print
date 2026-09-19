import { Injectable, CanActivate, ExecutionContext, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PrintCompletedGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const jobId = request.params.jobId || request.body?.jobId;

    if (!jobId) {
      throw new BadRequestException('Job ID is required to verify print completion.');
    }

    const job = await this.prisma.printJob.findUnique({
      where: { id: jobId },
      select: { printingCompleted: true, status: true },
    });

    if (!job) {
      throw new BadRequestException('Print job not found.');
    }

    if (!job.printingCompleted) {
      throw new BadRequestException(
        'Payment cannot be processed yet. Document printing has not been completed by the shop.',
      );
    }

    return true;
  }
}
