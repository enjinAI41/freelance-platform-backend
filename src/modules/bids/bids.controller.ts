import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../shared/auth-user.type';
import { CreateBidDto } from './dto/create-bid.dto';
import { ListJobBidsQueryDto } from './dto/list-job-bids-query.dto';
import { BidsService } from './bids.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class BidsController {
  constructor(private readonly bidsService: BidsService) {}

  @Post('jobs/:jobId/bids')
  @Roles(RoleName.FREELANCER)
  create(
    @Param('jobId', ParseIntPipe) jobId: number,
    @Req() req: { user: AuthUser },
    @Body() dto: CreateBidDto,
  ) {
    return this.bidsService.create(jobId, req.user.userId, dto);
  }

  @Get('jobs/:jobId/bids')
  @Roles(RoleName.CUSTOMER)
  listForJob(
    @Param('jobId', ParseIntPipe) jobId: number,
    @Req() req: { user: AuthUser },
    @Query() query: ListJobBidsQueryDto,
  ) {
    return this.bidsService.listForJob(jobId, req.user.userId, query);
  }

  @Patch('bids/:id/withdraw')
  @Roles(RoleName.FREELANCER)
  withdraw(@Param('id', ParseIntPipe) id: number, @Req() req: { user: AuthUser }) {
    return this.bidsService.withdraw(id, req.user.userId);
  }

  @Patch('bids/:id/accept')
  @Roles(RoleName.CUSTOMER)
  accept(@Param('id', ParseIntPipe) id: number, @Req() req: { user: AuthUser }) {
    return this.bidsService.accept(id, req.user.userId);
  }
}
