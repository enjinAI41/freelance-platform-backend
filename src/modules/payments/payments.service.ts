import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DeliveryStatus, MilestoneStatus, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createPaymentRecord(customerId: number, dto: CreatePaymentDto) {
    return this.prisma.$transaction(
      async (tx) => {
        const project = await tx.project.findUnique({ where: { id: dto.projectId } });
        if (!project) {
          throw new NotFoundException('Project not found');
        }

        if (project.customerId !== customerId) {
          throw new ForbiddenException('Only project customer can create payment record');
        }

        if (dto.milestoneId !== undefined) {
          const milestone = await tx.milestone.findUnique({ where: { id: dto.milestoneId } });
          if (!milestone) {
            throw new NotFoundException('Milestone not found');
          }

          if (milestone.projectId !== dto.projectId) {
            throw new BadRequestException('Milestone does not belong to project');
          }
        }

        if (dto.status === PaymentStatus.RELEASED) {
          if (dto.milestoneId) {
            const milestone = await tx.milestone.findUnique({
              where: { id: dto.milestoneId },
              include: {
                deliveries: {
                  where: { status: DeliveryStatus.APPROVED },
                  take: 1,
                },
              },
            });

            if (
              !milestone ||
              milestone.status !== MilestoneStatus.APPROVED ||
              milestone.deliveries.length === 0
            ) {
              throw new BadRequestException('Released status requires approved delivery');
            }
          } else if (project.status !== 'COMPLETED') {
            throw new BadRequestException('Project-level released payment requires completed project');
          }
        }

        try {
          return await tx.payment.create({
            data: {
              projectId: project.id,
              milestoneId: dto.milestoneId ?? null,
              amount: dto.amount,
              currency: dto.currency?.toUpperCase() ?? project.currency,
              status: dto.status ?? PaymentStatus.PENDING,
              releasedAt: dto.status === PaymentStatus.RELEASED ? new Date() : null,
              refundedAt: dto.status === PaymentStatus.REFUNDED ? new Date() : null,
            },
          });
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            throw new ConflictException('Payment already exists for this milestone');
          }
          throw error;
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async listMyHistory(userId: number, roles: string[]) {
    const isCustomer = roles.includes('CUSTOMER');
    const isFreelancer = roles.includes('FREELANCER');
    const isArbiter = roles.includes('ARBITER');

    if (!isCustomer && !isFreelancer && !isArbiter) {
      throw new ForbiddenException('You are not allowed to view payments');
    }

    const projectScope = isCustomer && isFreelancer
      ? { OR: [{ customerId: userId }, { freelancerId: userId }] }
      : isCustomer
        ? { customerId: userId }
        : { freelancerId: userId };

    const where: Prisma.PaymentWhereInput = isArbiter
      ? {}
      : {
          OR: [
            {
              milestone: {
                project: projectScope,
              },
            },
            {
              project: projectScope,
            },
          ],
        };

    return this.prisma.payment.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            title: true,
            customerId: true,
            freelancerId: true,
          },
        },
        milestone: {
          select: {
            id: true,
            title: true,
            sequence: true,
            project: {
              select: {
                id: true,
                title: true,
                customerId: true,
                freelancerId: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getWalletSummary(userId: number, roles: string[]) {
    const payments = await this.listMyHistory(userId, roles);

    const toNumber = (value: Prisma.Decimal | number | string) => Number(value);

    const totals = {
      pendingAmount: 0,
      releasedAmount: 0,
      refundedAmount: 0,
      pendingCount: 0,
      releasedCount: 0,
      refundedCount: 0,
    };

    for (const payment of payments) {
      const amount = toNumber(payment.amount);
      if (payment.status === PaymentStatus.PENDING) {
        totals.pendingAmount += amount;
        totals.pendingCount += 1;
      } else if (payment.status === PaymentStatus.RELEASED) {
        totals.releasedAmount += amount;
        totals.releasedCount += 1;
      } else if (payment.status === PaymentStatus.REFUNDED) {
        totals.refundedAmount += amount;
        totals.refundedCount += 1;
      }
    }

    return {
      ...totals,
      currency: payments[0]?.currency ?? 'TRY',
      totalRecords: payments.length,
    };
  }

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

        if (!payment.milestone) {
          throw new BadRequestException('Only milestone-linked payments can be released');
        }

        if (payment.milestone.project.customerId !== customerId) {
          throw new ForbiddenException('Only project customer can release payment');
        }

        if (payment.status !== PaymentStatus.PENDING) {
          throw new BadRequestException('Only pending payments can be released');
        }

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

        if (!payment.milestone) {
          throw new BadRequestException('Only milestone-linked payments can be refunded');
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
