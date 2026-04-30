import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DeliveryStatus,
  MilestoneStatus,
  PaymentStatus,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { RequestDeliveryRevisionDto } from './dto/request-delivery-revision.dto';

type TxClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

@Injectable()
export class DeliveriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    milestoneId: number,
    freelancerId: number,
    dto: CreateDeliveryDto & { submissionUrl: string },
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const milestone = await tx.milestone.findUnique({
          where: { id: milestoneId },
          include: { project: true },
        });

        if (!milestone) {
          throw new NotFoundException('Milestone not found');
        }

        if (milestone.project.freelancerId !== freelancerId) {
          throw new ForbiddenException('Only assigned freelancer can upload delivery');
        }

        if (milestone.status === MilestoneStatus.APPROVED || milestone.status === MilestoneStatus.CANCELED) {
          throw new BadRequestException('Delivery cannot be uploaded for approved/canceled milestone');
        }

        const latestDelivery = await tx.delivery.findFirst({
          where: { milestoneId },
          orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
        });
        const nextVersion = (latestDelivery?.version ?? 0) + 1;

        const delivery = await tx.delivery.create({
          data: {
            milestoneId,
            submittedById: freelancerId,
            version: nextVersion,
            submissionUrl: dto.submissionUrl,
            fileName: dto.fileName,
            mimeType: dto.mimeType,
            fileSizeBytes: dto.fileSizeBytes,
            note: dto.note,
            status: DeliveryStatus.SUBMITTED,
          },
        });

        // Yeni delivery yuku milestone'u tekrar "submitted" state'ine tasir.
        await tx.milestone.update({
          where: { id: milestoneId },
          data: {
            status: MilestoneStatus.SUBMITTED,
            approvedAt: null,
          },
        });

        return delivery;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async listByMilestone(milestoneId: number, userId: number, roles: string[]) {
    const milestone = await this.prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { project: true },
    });

    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    const isParticipant =
      milestone.project.customerId === userId || milestone.project.freelancerId === userId;
    const isArbiter = roles.includes('ARBITER');
    if (!isParticipant && !isArbiter) {
      throw new ForbiddenException('You are not allowed to view deliveries');
    }

    return this.prisma.delivery.findMany({
      where: { milestoneId },
      orderBy: { version: 'asc' },
    });
  }

  async approve(deliveryId: number, customerId: number) {
    return this.prisma.$transaction(
      async (tx) => {
        const delivery = await this.loadDeliveryOrThrow(tx, deliveryId);

        if (delivery.milestone.project.customerId !== customerId) {
          throw new ForbiddenException('Only project customer can approve delivery');
        }

        if (delivery.status === DeliveryStatus.APPROVED) {
          throw new BadRequestException('Delivery is already approved');
        }

        await this.ensureLatestVersion(tx, delivery.id, delivery.milestoneId);

        const approvedAt = new Date();
        const approvedDelivery = await tx.delivery.update({
          where: { id: delivery.id },
          data: {
            status: DeliveryStatus.APPROVED,
            approvedAt,
            revisionReason: null,
          },
        });

        await tx.milestone.update({
          where: { id: delivery.milestoneId },
          data: {
            status: MilestoneStatus.APPROVED,
            approvedAt,
          },
        });

        // Milestone onayi sonrasinda payment kaydini garanti eder.
        const payment = await tx.payment.upsert({
          where: { milestoneId: delivery.milestoneId },
          update: {},
          create: {
            projectId: delivery.milestone.projectId,
            milestoneId: delivery.milestoneId,
            amount: delivery.milestone.amount,
            currency: delivery.milestone.project.currency,
            status: PaymentStatus.PENDING,
          },
        });

        return { delivery: approvedDelivery, payment };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async requestRevision(deliveryId: number, customerId: number, dto: RequestDeliveryRevisionDto) {
    return this.prisma.$transaction(
      async (tx) => {
        const delivery = await this.loadDeliveryOrThrow(tx, deliveryId);

        if (delivery.milestone.project.customerId !== customerId) {
          throw new ForbiddenException('Only project customer can request revision');
        }

        if (delivery.status === DeliveryStatus.APPROVED) {
          throw new BadRequestException('Approved delivery cannot receive revision request');
        }

        await this.ensureLatestVersion(tx, delivery.id, delivery.milestoneId);

        const revisedDelivery = await tx.delivery.update({
          where: { id: delivery.id },
          data: {
            status: DeliveryStatus.REVISION_REQUESTED,
            revisionReason: dto.reason,
            approvedAt: null,
          },
        });

        await tx.milestone.update({
          where: { id: delivery.milestoneId },
          data: {
            status: MilestoneStatus.REVISION_REQUESTED,
            approvedAt: null,
          },
        });

        return revisedDelivery;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private async loadDeliveryOrThrow(tx: TxClient, deliveryId: number) {
    const delivery = await tx.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        milestone: {
          include: {
            project: true,
          },
        },
      },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    return delivery;
  }

  private async ensureLatestVersion(tx: TxClient, deliveryId: number, milestoneId: number) {
    const latestDelivery = await tx.delivery.findFirst({
      where: { milestoneId },
      orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
    });

    // Eski versiyonlar approve/revision alamaz; sadece son teslim islenir.
    if (!latestDelivery || latestDelivery.id !== deliveryId) {
      throw new BadRequestException('Only latest delivery version can be processed');
    }
  }
}
