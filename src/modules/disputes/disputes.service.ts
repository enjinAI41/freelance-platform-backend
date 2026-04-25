import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DisputeResolution,
  DisputeStatus,
  Prisma,
  ProjectStatus,
  RoleName,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AssignArbiterDto } from './dto/assign-arbiter.dto';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ListDisputesQueryDto } from './dto/list-disputes-query.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';

@Injectable()
export class DisputesService {
  private readonly logger = new Logger(DisputesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(projectId: number, openedById: number, dto: CreateDisputeDto) {
    return this.prisma.$transaction(
      async (tx) => {
        const project = await tx.project.findUnique({ where: { id: projectId } });
        if (!project) {
          throw new NotFoundException('Project not found');
        }

        const isParticipant = project.customerId === openedById || project.freelancerId === openedById;
        if (!isParticipant) {
          throw new ForbiddenException('Only project participant can open dispute');
        }

        if (dto.milestoneId !== undefined) {
          const milestone = await tx.milestone.findUnique({ where: { id: dto.milestoneId } });
          if (!milestone) {
            throw new NotFoundException('Milestone not found');
          }

          // Milestone baglandiginda ayni projecte ait olmasi zorunludur.
          if (milestone.projectId !== projectId) {
            throw new BadRequestException('Milestone does not belong to project');
          }
        }

        const activeKey = this.buildActiveKey(projectId);
        const existingOpenDispute = await tx.dispute.findUnique({ where: { activeKey } });
        if (existingOpenDispute) {
          throw new ConflictException('There is already an active dispute for this project');
        }

        try {
          const dispute = await tx.dispute.create({
            data: {
              projectId,
              milestoneId: dto.milestoneId ?? null,
              openedById,
              reason: dto.reason,
              evidenceUrls: dto.evidenceUrls,
              status: DisputeStatus.OPEN,
              activeKey,
            },
            include: {
              project: { select: { id: true, title: true, status: true } },
              milestone: { select: { id: true, title: true, sequence: true } },
              openedBy: { select: { id: true, fullName: true, email: true } },
            },
          });

          await tx.project.update({
            where: { id: projectId },
            data: { status: ProjectStatus.DISPUTED },
          });

          this.logger.log(
            `Dispute opened | disputeId=${dispute.id} | projectId=${projectId} | openedBy=${openedById}`,
          );

          return dispute;
        } catch (error) {
          // activeKey unique yarisi olursa 409 olarak don.
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            throw new ConflictException('There is already an active dispute for this project');
          }
          throw error;
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async list(userId: number, roles: string[], query: ListDisputesQueryDto) {
    const where: Prisma.DisputeWhereInput = {
      projectId: query.projectId,
    };

    const isArbiter = roles.includes(RoleName.ARBITER);
    if (isArbiter) {
      // Arbiter defaultte tum acik dispute'lari gorur.
      where.status = query.status ?? DisputeStatus.OPEN;
    } else {
      where.status = query.status;
      where.project = {
        OR: [{ customerId: userId }, { freelancerId: userId }],
      };
    }

    return this.prisma.dispute.findMany({
      where,
      include: {
        project: { select: { id: true, title: true, status: true, customerId: true, freelancerId: true } },
        milestone: { select: { id: true, title: true, sequence: true } },
        openedBy: { select: { id: true, fullName: true } },
        assignedArbiter: { select: { id: true, fullName: true } },
        resolvedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDetail(disputeId: number, userId: number, roles: string[]) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        project: { select: { id: true, title: true, status: true, customerId: true, freelancerId: true } },
        milestone: { select: { id: true, title: true, sequence: true, status: true } },
        openedBy: { select: { id: true, fullName: true, email: true } },
        assignedArbiter: { select: { id: true, fullName: true, email: true } },
        resolvedBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    const isArbiter = roles.includes(RoleName.ARBITER);
    const isParticipant = dispute.project.customerId === userId || dispute.project.freelancerId === userId;
    if (!isArbiter && !isParticipant) {
      throw new ForbiddenException('You are not allowed to view this dispute');
    }

    return dispute;
  }

  async cancel(disputeId: number, userId: number) {
    return this.prisma.$transaction(
      async (tx) => {
        const dispute = await tx.dispute.findUnique({
          where: { id: disputeId },
          include: {
            project: true,
          },
        });

        if (!dispute) {
          throw new NotFoundException('Dispute not found');
        }

        const isParticipant = dispute.project.customerId === userId || dispute.project.freelancerId === userId;
        if (!isParticipant) {
          throw new ForbiddenException('Only project participant can cancel dispute');
        }

        if (dispute.status !== DisputeStatus.OPEN) {
          throw new ConflictException('Only open dispute can be canceled');
        }

        const canceledDispute = await tx.dispute.update({
          where: { id: disputeId },
          data: {
            status: DisputeStatus.CANCELED,
            canceledAt: new Date(),
            activeKey: null,
          },
          include: {
            project: { select: { id: true, title: true, status: true } },
            milestone: { select: { id: true, title: true, sequence: true } },
            openedBy: { select: { id: true, fullName: true } },
          },
        });

        // Acik dispute kapandiginda project tekrar aktif akisa alinabilir.
        if (dispute.project.status === ProjectStatus.DISPUTED) {
          await tx.project.update({
            where: { id: dispute.projectId },
            data: { status: ProjectStatus.ACTIVE },
          });
        }

        this.logger.log(
          `Dispute canceled | disputeId=${canceledDispute.id} | projectId=${dispute.projectId} | byUser=${userId}`,
        );

        return canceledDispute;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async assignArbiter(disputeId: number, actorId: number, roles: string[], dto: AssignArbiterDto) {
    if (!roles.includes(RoleName.ARBITER)) {
      throw new ForbiddenException('Only ARBITER can assign disputes');
    }

    const targetArbiterId = dto.arbiterId ?? actorId;

    return this.prisma.$transaction(
      async (tx) => {
        const [dispute, targetArbiterRole] = await Promise.all([
          tx.dispute.findUnique({ where: { id: disputeId } }),
          tx.userRole.findFirst({
            where: {
              userId: targetArbiterId,
              role: { name: RoleName.ARBITER },
            },
          }),
        ]);

        if (!dispute) {
          throw new NotFoundException('Dispute not found');
        }

        if (!targetArbiterRole) {
          throw new BadRequestException('Target user is not an ARBITER');
        }

        if (dispute.status !== DisputeStatus.OPEN) {
          throw new ConflictException('Only open dispute can be assigned');
        }

        if (dispute.assignedArbiterId && dispute.assignedArbiterId !== targetArbiterId) {
          throw new ConflictException('Dispute is already assigned to another arbiter');
        }

        const assigned = await tx.dispute.update({
          where: { id: disputeId },
          data: {
            assignedArbiterId: targetArbiterId,
          },
          include: {
            project: { select: { id: true, title: true } },
            assignedArbiter: { select: { id: true, fullName: true, email: true } },
          },
        });

        return assigned;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async resolve(disputeId: number, arbiterId: number, roles: string[], dto: ResolveDisputeDto) {
    if (!roles.includes(RoleName.ARBITER)) {
      throw new ForbiddenException('Only ARBITER can resolve dispute');
    }

    return this.prisma.$transaction(
      async (tx) => {
        const dispute = await tx.dispute.findUnique({
          where: { id: disputeId },
          include: {
            project: true,
            milestone: {
              include: {
                payment: true,
              },
            },
          },
        });

        if (!dispute) {
          throw new NotFoundException('Dispute not found');
        }

        if (dispute.status !== DisputeStatus.OPEN) {
          throw new ConflictException('Only open dispute can be resolved');
        }

        if (!dispute.assignedArbiterId) {
          throw new ConflictException('Dispute must be assigned to an arbiter before resolve');
        }

        if (dispute.assignedArbiterId !== arbiterId) {
          throw new ForbiddenException('Only assigned arbiter can resolve this dispute');
        }

        const paymentActionNote = this.buildPaymentActionNote(
          dto.resolution,
          dispute.milestone?.payment?.id ?? null,
        );

        if (dispute.milestone?.payment?.id) {
          const paymentId = dispute.milestone.payment.id;

          if (dto.resolution === DisputeResolution.RELEASE_PAYMENT) {
            await tx.payment.update({
              where: { id: paymentId },
              data: {
                status: 'RELEASED',
                releasedAt: new Date(),
              },
            });
          }

          if (
            dto.resolution === DisputeResolution.REFUND_PAYMENT ||
            dto.resolution === DisputeResolution.PARTIAL_REFUND
          ) {
            await tx.payment.update({
              where: { id: paymentId },
              data: {
                status: 'REFUNDED',
                refundedAt: new Date(),
                refundReason:
                  dto.resolution === DisputeResolution.PARTIAL_REFUND
                    ? `Partial refund decision: ${dto.decisionNote}`
                    : dto.decisionNote,
              },
            });
          }
        }

        const resolvedDispute = await tx.dispute.update({
          where: { id: disputeId },
          data: {
            status: DisputeStatus.RESOLVED,
            resolution: dto.resolution,
            resolutionNote: dto.decisionNote,
            paymentActionNote,
            resolvedById: arbiterId,
            resolvedAt: new Date(),
            activeKey: null,
          },
          include: {
            project: { select: { id: true, title: true, status: true } },
            milestone: { select: { id: true, title: true, sequence: true } },
            openedBy: { select: { id: true, fullName: true } },
            resolvedBy: { select: { id: true, fullName: true } },
          },
        });

        await tx.project.update({
          where: { id: dispute.projectId },
          data: { status: ProjectStatus.RESOLVED },
        });

        this.logger.log(
          `Dispute resolved | disputeId=${resolvedDispute.id} | projectId=${dispute.projectId} | arbiterId=${arbiterId} | resolution=${dto.resolution}`,
        );

        return resolvedDispute;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private buildActiveKey(projectId: number) {
    return `dispute:project:${projectId}:open`;
  }

  private buildPaymentActionNote(resolution: DisputeResolution, paymentId: number | null) {
    const paymentText = paymentId ? `paymentId=${paymentId}` : 'payment record not found';

    switch (resolution) {
      case DisputeResolution.RELEASE_PAYMENT:
        return `Arbiter decision: release payment action applied (${paymentText}).`;
      case DisputeResolution.REFUND_PAYMENT:
        return `Arbiter decision: refund payment action applied (${paymentText}).`;
      case DisputeResolution.PARTIAL_REFUND:
        return `Arbiter decision: partial refund action applied (${paymentText}).`;
      case DisputeResolution.NO_ACTION:
      default:
        return `Arbiter decision: no payment action applied (${paymentText}).`;
    }
  }
}
