import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DeliveryStatus, Prisma, ProjectStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private buildProjectScope(userId: number, roles: string[]): Prisma.ProjectWhereInput {
    const isCustomer = roles.includes('CUSTOMER');
    const isFreelancer = roles.includes('FREELANCER');
    const isArbiter = roles.includes('ARBITER');

    if (isArbiter) {
      return {};
    }

    if (isCustomer && isFreelancer) {
      return { OR: [{ customerId: userId }, { freelancerId: userId }] };
    }

    if (isCustomer) {
      return { customerId: userId };
    }

    if (isFreelancer) {
      return { freelancerId: userId };
    }

    throw new ForbiddenException('You are not allowed to access reports');
  }

  async getDashboardSummary(userId: number, roles: string[]) {
    const scope = this.buildProjectScope(userId, roles);
    const isArbiter = roles.includes('ARBITER');

    const [projectCounts, paymentAgg, openDisputes, avgRating, assignedOpenDisputes] = await Promise.all([
      this.prisma.project.groupBy({
        by: ['status'],
        where: scope,
        _count: { status: true },
      }),
      this.prisma.payment.aggregate({
        where: isArbiter
          ? {}
          : {
              OR: [{ project: scope }, { milestone: { project: scope } }],
            },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.dispute.count({
        where: isArbiter
          ? { status: 'OPEN' }
          : {
              status: 'OPEN',
              project: scope,
            },
      }),
      this.prisma.review.aggregate({
        where: { revieweeId: userId },
        _avg: { rating: true },
        _count: { id: true },
      }),
      this.prisma.dispute.count({
        where: {
          status: 'OPEN',
          assignedArbiterId: userId,
        },
      }),
    ]);

    return {
      roles,
      projectsByStatus: projectCounts.reduce<Record<string, number>>((acc, row) => {
        acc[row.status] = row._count.status;
        return acc;
      }, {}),
      openDisputes,
      assignedOpenDisputes: isArbiter ? assignedOpenDisputes : undefined,
      paymentSummary: {
        totalRecords: paymentAgg._count.id,
        totalAmount: Number(paymentAgg._sum.amount ?? 0),
      },
      freelancerRating: {
        average: Number(avgRating._avg.rating ?? 0),
        reviewCount: avgRating._count.id,
      },
    };
  }

  async getFreelancerPerformance(userId: number, roles: string[], freelancerId?: number) {
    const isFreelancer = roles.includes('FREELANCER');
    const targetFreelancerId = freelancerId ?? (isFreelancer ? userId : undefined);

    if (!targetFreelancerId) {
      throw new ForbiddenException('freelancerId is required for this role');
    }

    if (!roles.includes('ARBITER') && !roles.includes('CUSTOMER') && targetFreelancerId !== userId) {
      throw new ForbiddenException('You cannot view performance of another freelancer');
    }

    const [completedProjects, deliveryCounts, approvedDeliveries, ratings] = await Promise.all([
      this.prisma.project.count({
        where: {
          freelancerId: targetFreelancerId,
          status: ProjectStatus.COMPLETED,
        },
      }),
      this.prisma.delivery.groupBy({
        by: ['status'],
        where: {
          submittedById: targetFreelancerId,
        },
        _count: { status: true },
      }),
      this.prisma.delivery.findMany({
        where: {
          submittedById: targetFreelancerId,
          status: DeliveryStatus.APPROVED,
          approvedAt: { not: null },
        },
        select: {
          approvedAt: true,
          milestone: {
            select: {
              dueDate: true,
            },
          },
        },
      }),
      this.prisma.review.aggregate({
        where: { revieweeId: targetFreelancerId },
        _avg: { rating: true },
        _count: { id: true },
      }),
    ]);

    const approved = deliveryCounts.find((item) => item.status === DeliveryStatus.APPROVED)?._count.status ?? 0;
    const revised =
      deliveryCounts.find((item) => item.status === DeliveryStatus.REVISION_REQUESTED)?._count.status ?? 0;
    const submitted = deliveryCounts.find((item) => item.status === DeliveryStatus.SUBMITTED)?._count.status ?? 0;

    const handledDeliveries = approved + revised + submitted;
    const onTimeCount = approvedDeliveries.filter(
      (delivery) => delivery.milestone.dueDate && delivery.approvedAt && delivery.approvedAt <= delivery.milestone.dueDate,
    ).length;

    return {
      freelancerId: targetFreelancerId,
      completedProjects,
      deliveries: {
        approved,
        revisionRequested: revised,
        submitted,
      },
      onTimeDeliveryCount: onTimeCount,
      onTimeDeliveryRatio: approved > 0 ? Number((onTimeCount / approved).toFixed(2)) : 0,
      ratings: {
        average: Number(ratings._avg.rating ?? 0),
        count: ratings._count.id,
      },
      activityScore: handledDeliveries,
    };
  }

  async getBudgetAnalysis(userId: number, roles: string[], projectId?: number) {
    const scope = this.buildProjectScope(userId, roles);

    if (projectId) {
      const project = await this.prisma.project.findFirst({
        where: {
          id: projectId,
          ...scope,
        },
        include: {
          payments: true,
          milestones: {
            include: {
              payment: true,
            },
            orderBy: { sequence: 'asc' },
          },
        },
      });

      if (!project) {
        throw new NotFoundException('Project not found or not accessible');
      }

      const totalBudget = Number(project.totalAmount);
      const milestonePlanned = project.milestones.reduce((sum, milestone) => sum + Number(milestone.amount), 0);
      const projectLevelPayments = project.payments.filter((payment) => payment.milestoneId === null);
      const released = project.milestones.reduce((sum, milestone) => {
        if (milestone.payment?.status === 'RELEASED') {
          return sum + Number(milestone.payment.amount);
        }
        return sum;
      }, 0) + projectLevelPayments
        .filter((payment) => payment.status === 'RELEASED')
        .reduce((sum, payment) => sum + Number(payment.amount), 0);
      const refunded = project.milestones.reduce((sum, milestone) => {
        if (milestone.payment?.status === 'REFUNDED') {
          return sum + Number(milestone.payment.amount);
        }
        return sum;
      }, 0) + projectLevelPayments
        .filter((payment) => payment.status === 'REFUNDED')
        .reduce((sum, payment) => sum + Number(payment.amount), 0);

      return {
        projectId: project.id,
        title: project.title,
        totalBudget,
        milestonePlanned,
        released,
        refunded,
        remainingBudget: totalBudget - milestonePlanned,
        milestones: project.milestones.map((milestone) => ({
          id: milestone.id,
          title: milestone.title,
          sequence: milestone.sequence,
          amount: Number(milestone.amount),
          status: milestone.status,
          paymentStatus: milestone.payment?.status ?? null,
        })),
        projectLevelPayments: projectLevelPayments.map((payment) => ({
          id: payment.id,
          amount: Number(payment.amount),
          status: payment.status,
        })),
      };
    }

    const projects = await this.prisma.project.findMany({
      where: scope,
      include: {
        payments: true,
        milestones: {
          include: {
            payment: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const summary = projects.reduce(
      (acc, project) => {
        acc.projectCount += 1;
        acc.totalBudget += Number(project.totalAmount);

        for (const milestone of project.milestones) {
          acc.milestonePlanned += Number(milestone.amount);
          if (milestone.payment?.status === 'RELEASED') {
            acc.released += Number(milestone.payment.amount);
          } else if (milestone.payment?.status === 'REFUNDED') {
            acc.refunded += Number(milestone.payment.amount);
          }
        }

        for (const payment of project.payments) {
          if (payment.milestoneId !== null) {
            continue;
          }
          if (payment.status === 'RELEASED') {
            acc.released += Number(payment.amount);
          } else if (payment.status === 'REFUNDED') {
            acc.refunded += Number(payment.amount);
          }
        }

        return acc;
      },
      {
        projectCount: 0,
        totalBudget: 0,
        milestonePlanned: 0,
        released: 0,
        refunded: 0,
      },
    );

    return {
      ...summary,
      remainingBudget: summary.totalBudget - summary.milestonePlanned,
    };
  }
}
