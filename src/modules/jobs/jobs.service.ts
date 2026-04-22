import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JobStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { ListJobsQueryDto } from './dto/list-jobs-query.dto';

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(customerId: number, dto: CreateJobDto) {
    if (dto.budgetMin !== undefined && dto.budgetMax !== undefined && dto.budgetMin > dto.budgetMax) {
      throw new BadRequestException('budgetMin cannot be greater than budgetMax');
    }

    return this.prisma.jobListing.create({
      data: {
        customerId,
        title: dto.title,
        description: dto.description,
        budgetMin: dto.budgetMin,
        budgetMax: dto.budgetMax,
        currency: dto.currency?.toUpperCase() ?? 'TRY',
        deadlineAt: dto.deadlineAt ? new Date(dto.deadlineAt) : null,
        status: JobStatus.OPEN,
        publishedAt: new Date(),
      },
    });
  }

  async update(jobId: number, customerId: number, dto: UpdateJobDto) {
    const job = await this.prisma.jobListing.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.customerId !== customerId) {
      throw new ForbiddenException('You can only update your own jobs');
    }

    if (dto.budgetMin !== undefined && dto.budgetMax !== undefined && dto.budgetMin > dto.budgetMax) {
      throw new BadRequestException('budgetMin cannot be greater than budgetMax');
    }

    const data: Prisma.JobListingUpdateInput = {
      title: dto.title,
      description: dto.description,
      budgetMin: dto.budgetMin,
      budgetMax: dto.budgetMax,
      currency: dto.currency ? dto.currency.toUpperCase() : undefined,
      deadlineAt: dto.deadlineAt ? new Date(dto.deadlineAt) : undefined,
      status: dto.status,
    };

    // Job kapatildiysa kapatilma zamanini set et
    if (dto.status === JobStatus.CLOSED || dto.status === JobStatus.CANCELED) {
      data.closedAt = new Date();
    }

    return this.prisma.jobListing.update({
      where: { id: jobId },
      data,
    });
  }

  async list(query: ListJobsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.JobListingWhereInput = {
      status: query.status,
      customerId: query.customerId,
    };

    if (query.q) {
      where.OR = [
        { title: { contains: query.q } },
        { description: { contains: query.q } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.jobListing.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.jobListing.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
      },
    };
  }

  async getDetail(id: number) {
    const job = await this.prisma.jobListing.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return job;
  }
}
