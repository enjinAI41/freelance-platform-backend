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

  private normalizeSkills(skills?: string[]) {
    if (!skills) {
      return undefined;
    }

    const normalized = skills
      .map((skill) => skill.trim())
      .filter((skill) => skill.length > 0)
      .map((skill) => skill.toLowerCase());

    return [...new Set(normalized)];
  }

  async create(customerId: number, dto: CreateJobDto) {
    if (dto.budgetMin !== undefined && dto.budgetMax !== undefined && dto.budgetMin > dto.budgetMax) {
      throw new BadRequestException('budgetMin cannot be greater than budgetMax');
    }

    return this.prisma.jobListing.create({
      data: {
        customerId,
        title: dto.title,
        description: dto.description,
        category: dto.category?.trim() || null,
        skills: this.normalizeSkills(dto.skills),
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
      category: dto.category?.trim() || undefined,
      skills: dto.skills ? this.normalizeSkills(dto.skills) : undefined,
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
      // Varsayilan pazar listesi sadece OPEN ilanlari dondurur.
      status: query.status ?? JobStatus.OPEN,
      customerId: query.customerId,
    };

    if (query.q) {
      where.OR = [
        { title: { contains: query.q } },
        { description: { contains: query.q } },
      ];
    }

    if (query.category) {
      where.category = { equals: query.category };
    }

    if (query.skill) {
      where.skills = {
        array_contains: [query.skill.toLowerCase()],
      };
    }

    if (query.budgetMin !== undefined) {
      where.budgetMax = { gte: query.budgetMin };
    }

    if (query.budgetMax !== undefined) {
      where.budgetMin = { lte: query.budgetMax };
    }

    if (query.deadlineDaysMax !== undefined) {
      const maxDeadlineDate = new Date();
      maxDeadlineDate.setDate(maxDeadlineDate.getDate() + query.deadlineDaysMax);
      where.deadlineAt = {
        not: null,
        lte: maxDeadlineDate,
      };
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

  async remove(jobId: number, customerId: number) {
    const job = await this.prisma.jobListing.findUnique({
      where: { id: jobId },
      include: {
        project: { select: { id: true } },
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.customerId !== customerId) {
      throw new ForbiddenException('You can only delete your own jobs');
    }

    if (job.project) {
      throw new BadRequestException('Job with active project cannot be deleted');
    }

    await this.prisma.$transaction([
      this.prisma.bid.deleteMany({ where: { jobListingId: jobId } }),
      this.prisma.jobListing.delete({ where: { id: jobId } }),
    ]);

    return { deleted: true };
  }
}
