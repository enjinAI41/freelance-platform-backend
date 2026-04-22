import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DeliveryStatus, MilestoneStatus, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RefundPaymentDto } from './dto/refund-payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async release(paymentId: number, customerId: number) {
    return this.prisma.$transaction(
      async (tx) => {
        const payment = await tx.payment.findUnique({
          where: { id: paymentId },
          include: {
            milestone: {
              include: {
                project: true,
                deliveries: {
                  where: { status: DeliveryStatus.APPROVED },
                  take: 1,
                },
              },
            },
          },
        });

        if (!payment) {
          throw new NotFoundException('Payment not found');
        }

        if (payment.milestone.project.customerId !== customerId) {
          throw new ForbiddenException('Only project customer can release payment');
        }

        if (payment.status !== PaymentStatus.PENDING) {
          throw new BadRequestException('Only pending payments can be released');
        }

        // Odeme release icin milestone approval + approved delivery birlikte gerekir.
        if (
          payment.milestone.status !== MilestoneStatus.APPROVED ||
          payment.milestone.deliveries.length === 0
        ) {
          throw new BadRequestException('Payment can only be released after delivery approval');
        }

        const releasedPayment = await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: PaymentStatus.RELEASED,
            releasedAt: new Date(),
          },
        });

        this.logger.log(
          `Payment released | paymentId=${releasedPayment.id} | customerId=${customerId} | milestoneId=${releasedPayment.milestoneId}`,
        );

        return releasedPayment;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async refund(paymentId: number, customerId: number, dto: RefundPaymentDto) {
    return this.prisma.$transaction(
      async (tx) => {
        const payment = await tx.payment.findUnique({
          where: { id: paymentId },
          include: {
            milestone: {
              include: {
                project: true,
              },
            },
          },
        });

        if (!payment) {
          throw new NotFoundException('Payment not found');
        }

        if (payment.milestone.project.customerId !== customerId) {
          throw new ForbiddenException('Only project customer can refund payment');
        }

        if (payment.status !== PaymentStatus.RELEASED) {
          throw new BadRequestException('Only released payments can be refunded');
        }

        const refundedPayment = await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: PaymentStatus.REFUNDED,
            refundedAt: new Date(),
            refundReason: dto.reason,
          },
        });

        this.logger.log(
          `Payment refunded | paymentId=${refundedPayment.id} | customerId=${customerId} | milestoneId=${refundedPayment.milestoneId}`,
        );

        return refundedPayment;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}
