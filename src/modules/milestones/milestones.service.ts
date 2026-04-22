import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MilestoneStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';

@Injectable()
export class MilestonesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(projectId: number, customerId: number, dto: CreateMilestoneDto) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const project = await tx.project.findUnique({ where: { id: projectId } });
          if (!project) {
            throw new NotFoundException('Project not found');
          }

          // Milestone yonetimi project owner (customer) tarafinda tutuluyor.
          if (project.customerId !== customerId) {
            throw new ForbiddenException('Only project owner can create milestones');
          }

          const lastMilestone = await tx.milestone.findFirst({
            where: { projectId },
            orderBy: { sequence: 'desc' },
          });

          const expectedSequence = (lastMilestone?.sequence ?? 0) + 1;
          if (dto.sequence !== expectedSequence) {
            throw new BadRequestException(`Sequence must be ${expectedSequence}`);
          }

          const sumAgg = await tx.milestone.aggregate({
            where: { projectId },
            _sum: { amount: true },
          });

          const usedAmount = Number(sumAgg._sum.amount ?? 0);
          const nextTotal = usedAmount + Number(dto.amount);
          if (nextTotal > Number(project.totalAmount)) {
            throw new BadRequestException('Milestone total exceeds project total amount');
          }

          return tx.milestone.create({
            data: {
              projectId,
              title: dto.title,
              description: dto.description,
              sequence: dto.sequence,
              amount: dto.amount,
              dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
              status: MilestoneStatus.PENDING,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      // MySQL unique(projectId, sequence) yarisi olursa daha anlamli mesaj don.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('Sequence already exists for this project');
      }
      throw error;
    }
  }

  async listByProject(projectId: number, userId: number, roles: string[]) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const isParticipant = project.customerId === userId || project.freelancerId === userId;
    const isArbiter = roles.includes('ARBITER');
    if (!isParticipant && !isArbiter) {
      throw new ForbiddenException('You are not allowed to view milestones');
    }

    return this.prisma.milestone.findMany({
      where: { projectId },
      orderBy: { sequence: 'asc' },
    });
  }

  async update(milestoneId: number, customerId: number, dto: UpdateMilestoneDto) {
    return this.prisma.$transaction(async (tx) => {
      const milestone = await tx.milestone.findUnique({
        where: { id: milestoneId },
        include: { project: true },
      });

      if (!milestone) {
        throw new NotFoundException('Milestone not found');
      }

      if (milestone.project.customerId !== customerId) {
        throw new ForbiddenException('Only project owner can update milestone');
      }

      if (milestone.status === MilestoneStatus.APPROVED || milestone.status === MilestoneStatus.CANCELED) {
        throw new BadRequestException('Approved/Canceled milestone cannot be edited');
      }

      if (dto.amount !== undefined) {
        const sumAgg = await tx.milestone.aggregate({
          where: {
            projectId: milestone.projectId,
            id: { not: milestone.id },
          },
          _sum: { amount: true },
        });

        const usedAmount = Number(sumAgg._sum.amount ?? 0);
        const nextTotal = usedAmount + Number(dto.amount);
        if (nextTotal > Number(milestone.project.totalAmount)) {
          throw new BadRequestException('Milestone total exceeds project total amount');
        }
      }

      return tx.milestone.update({
        where: { id: milestoneId },
        data: {
          title: dto.title,
          description: dto.description,
          amount: dto.amount,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          status: dto.status,
        },
      });
    });
  }
}
