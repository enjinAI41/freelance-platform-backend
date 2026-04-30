import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BidStatus, JobStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBidDto } from './dto/create-bid.dto';
import { ListJobBidsQueryDto } from './dto/list-job-bids-query.dto';

@Injectable()
export class BidsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(jobId: number, freelancerId: number, dto: CreateBidDto) {
    const job = await this.prisma.jobListing.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.status !== JobStatus.OPEN) {
      throw new BadRequestException('You can only bid on OPEN jobs');
    }

    if (job.customerId === freelancerId) {
      throw new BadRequestException('You cannot bid on your own job');
    }

    const activeKey = `${jobId}_${freelancerId}`;

    try {
      return await this.prisma.bid.create({
        data: {
          jobListingId: jobId,
          freelancerId,
          coverLetter: dto.coverLetter,
          proposedAmount: dto.proposedAmount,
          deliveryDays: dto.deliveryDays,
          status: BidStatus.ACTIVE,
          // activeKey unique oldugu icin ayni freelancer ayni ilanda 1 aktif teklif verebilir.
          activeKey,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('You already have an active bid for this job');
      }

      throw error;
    }
  }

  async listForJob(jobId: number, customerId: number, query: ListJobBidsQueryDto) {
    const job = await this.prisma.jobListing.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.customerId !== customerId) {
      throw new ForbiddenException('Only job owner can view bids');
    }

    return this.prisma.bid.findMany({
      where: {
        jobListingId: jobId,
        status: query.status,
      },
      include: {
        freelancer: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async withdraw(bidId: number, freelancerId: number) {
    const bid = await this.prisma.bid.findUnique({ where: { id: bidId } });
    if (!bid) {
      throw new NotFoundException('Bid not found');
    }

    if (bid.freelancerId !== freelancerId) {
      throw new ForbiddenException('You can only withdraw your own bid');
    }

    if (bid.status !== BidStatus.ACTIVE) {
      throw new BadRequestException('Only ACTIVE bids can be withdrawn');
    }

    return this.prisma.bid.update({
      where: { id: bidId },
      data: {
        status: BidStatus.WITHDRAWN,
        withdrawnAt: new Date(),
        activeKey: null,
      },
    });
  }

  async accept(bidId: number, customerId: number) {
    const bid = await this.prisma.bid.findUnique({
      where: { id: bidId },
      include: { jobListing: true },
    });

    if (!bid) {
      throw new NotFoundException('Bid not found');
    }

    if (bid.jobListing.customerId !== customerId) {
      throw new ForbiddenException('Only job owner can accept bids');
    }

    if (bid.status !== BidStatus.ACTIVE) {
      throw new BadRequestException('Only ACTIVE bids can be accepted');
    }

    if (bid.jobListing.status === JobStatus.CLOSED || bid.jobListing.status === JobStatus.CANCELED) {
      throw new BadRequestException('Cannot accept bids on CLOSED/CANCELED jobs');
    }

    const alreadyAccepted = await this.prisma.bid.findFirst({
      where: {
        jobListingId: bid.jobListingId,
        status: BidStatus.ACCEPTED,
      },
    });

    if (alreadyAccepted) {
      throw new ConflictException('This job already has an accepted bid');
    }

    // Bid kabul + diger aktif bidleri reddetme + job status guncelleme atomik olmali.
    await this.prisma.$transaction([
      this.prisma.bid.update({
        where: { id: bidId },
        data: {
          status: BidStatus.ACCEPTED,
          acceptedAt: new Date(),
          activeKey: null,
        },
      }),
      this.prisma.bid.updateMany({
        where: {
          jobListingId: bid.jobListingId,
          status: BidStatus.ACTIVE,
          id: { not: bidId },
        },
        data: {
          status: BidStatus.REJECTED,
          rejectedAt: new Date(),
          activeKey: null,
        },
      }),
      this.prisma.jobListing.update({
        where: { id: bid.jobListingId },
        data: {
          status: JobStatus.IN_PROGRESS,
        },
      }),
    ]);

    return this.prisma.bid.findUnique({ where: { id: bidId } });
  }
}
