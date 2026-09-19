import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ReceiptsService {
  constructor(private prisma: PrismaService) {}

  async getReceiptByJobId(jobId: string) {
    const receipt = await this.prisma.receipt.findFirst({
      where: { jobId },
      orderBy: { issuedAt: 'desc' },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            slug: true,
            address: true,
            phone: true,
          },
        },
        job: {
          select: {
            id: true,
            jobCode: true,
            status: true,
            paymentStatus: true,
            paymentMethod: true,
            createdAt: true,
          },
        },
      },
    });

    if (!receipt) {
      throw new NotFoundException('Receipt not found. Payment must be verified before a receipt is issued.');
    }

    return receipt;
  }
}
