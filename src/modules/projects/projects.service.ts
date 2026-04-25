import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BidStatus, JobStatus, Prisma, ProjectStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ListProjectsQueryDto } from './dto/list-projects-query.dto';
import { UpdateProjectStatusDto } from './dto/update-project-status.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async createFromBid(bidId: number, customerId: number) {
    const bid = await this.prisma.bid.findUnique({
      where: { id: bidId },
      include: { jobListing: true },
    });

    if (!bid) {
      throw new NotFoundException('Bid not found');
    }

    if (bid.jobListing.customerId !== customerId) {
      throw new ForbiddenException('Only job owner can create project from bid');
    }

    if (bid.status !== BidStatus.ACCEPTED) {
      throw new BadRequestException('Project can only be created from ACCEPTED bid');
    }

    const existingProject = await this.prisma.project.findFirst({
      where: {
        OR: [{ acceptedBidId: bid.id }, { jobListingId: bid.jobListingId }],
      },
    });

    if (existingProject) {
      throw new ConflictException('Project already exists for this accepted bid/job');
    }

    // Project olusumu ve job status guncelleme birlikte atomik ilerlemeli.
    const [project] = await this.prisma.$transaction([
      this.prisma.project.create({
        data: {
          jobListingId: bid.jobListingId,
          acceptedBidId: bid.id,
          customerId: bid.jobListing.customerId,
          freelancerId: bid.freelancerId,
          title: bid.jobListing.title,
          summary: bid.jobListing.description,
          totalAmount: bid.proposedAmount,
          currency: bid.jobListing.currency,
          startDate: new Date(),
          status: ProjectStatus.ACTIVE,
        },
      }),
      this.prisma.jobListing.update({
        where: { id: bid.jobListingId },
        data: { status: JobStatus.IN_PROGRESS },
      }),
    ]);

    return project;
  }

  async listForUser(userId: number, roles: string[], query: ListProjectsQueryDto) {
    const where: Prisma.ProjectWhereInput = {
      status: query.status,
    };

    // Kullanici hem CUSTOMER hem FREELANCER ise kendi tum projectleri gorur.
    const isCustomer = roles.includes('CUSTOMER');
    const isFreelancer = roles.includes('FREELANCER');

    if (isCustomer && isFreelancer) {
      where.OR = [{ customerId: userId }, { freelancerId: userId }];
    } else if (isCustomer) {
      where.customerId = userId;
    } else if (isFreelancer) {
      where.freelancerId = userId;
    } else {
      // Arbiter gibi roller burada project listeleyemez.
      throw new ForbiddenException('Only CUSTOMER/FREELANCER can list projects');
    }

    return this.prisma.project.findMany({
      where,
      include: {
        customer: { select: { id: true, fullName: true } },
        freelancer: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDetail(projectId: number, userId: number, roles: string[]) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        customer: { select: { id: true, fullName: true, email: true } },
        freelancer: { select: { id: true, fullName: true, email: true } },
        jobListing: { select: { id: true, title: true, status: true } },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const isParticipant = project.customerId === userId || project.freelancerId === userId;
    const isArbiter = roles.includes('ARBITER');
    if (!isParticipant && !isArbiter) {
      throw new ForbiddenException('You are not allowed to view this project');
    }

    return project;
  }

  async updateStatus(projectId: number, customerId: number, dto: UpdateProjectStatusDto) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.customerId !== customerId) {
      throw new ForbiddenException('Only project owner can update status');
    }

    if (project.status === ProjectStatus.COMPLETED || project.status === ProjectStatus.CANCELED) {
      throw new BadRequestException('Completed/Canceled project cannot be changed');
    }

    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        status: dto.status,
        endDate:
          dto.status === ProjectStatus.COMPLETED || dto.status === ProjectStatus.CANCELED
            ? dto.endDate
              ? new Date(dto.endDate)
              : new Date()
            : undefined,
      },
    });
  }

  async createReview(projectId: number, reviewerId: number, dto: CreateReviewDto) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.status !== ProjectStatus.COMPLETED) {
      throw new BadRequestException('Review can only be created after project completion');
    }

    const isParticipant = project.customerId === reviewerId || project.freelancerId === reviewerId;
    if (!isParticipant) {
      throw new ForbiddenException('Only project participants can create reviews');
    }

    const defaultRevieweeId = reviewerId === project.customerId ? project.freelancerId : project.customerId;
    const revieweeId = dto.revieweeId ?? defaultRevieweeId;

    if (revieweeId !== project.customerId && revieweeId !== project.freelancerId) {
      throw new BadRequestException('revieweeId must belong to project participants');
    }

    if (revieweeId === reviewerId) {
      throw new BadRequestException('You cannot review yourself');
    }

    try {
      return await this.prisma.review.create({
        data: {
          projectId,
          reviewerId,
          revieweeId,
          rating: dto.rating,
          comment: dto.comment,
        },
        include: {
          reviewer: { select: { id: true, fullName: true, email: true } },
          reviewee: { select: { id: true, fullName: true, email: true } },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('You have already reviewed this user for this project');
      }
      throw error;
    }
  }

  async listReviews(projectId: number, userId: number, roles: string[]) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const isParticipant = project.customerId === userId || project.freelancerId === userId;
    const isArbiter = roles.includes('ARBITER');
    if (!isParticipant && !isArbiter) {
      throw new ForbiddenException('You are not allowed to view reviews of this project');
    }

    return this.prisma.review.findMany({
      where: { projectId },
      include: {
        reviewer: { select: { id: true, fullName: true, email: true } },
        reviewee: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
