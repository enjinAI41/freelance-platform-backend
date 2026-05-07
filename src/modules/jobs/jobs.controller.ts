import { Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Body, Query, Req, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../shared/auth-user.type';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { ListJobsQueryDto } from './dto/list-jobs-query.dto';

@Controller('jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @Roles(RoleName.CUSTOMER)
  create(@Req() req: { user: AuthUser }, @Body() dto: CreateJobDto) {
    return this.jobsService.create(req.user.userId, dto);
  }

  @Patch(':id')
  @Roles(RoleName.CUSTOMER)
  update(
    @Req() req: { user: AuthUser },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateJobDto,
  ) {
    return this.jobsService.update(id, req.user.userId, dto);
  }

  @Get()
  @Roles(RoleName.CUSTOMER, RoleName.FREELANCER, RoleName.ARBITER)
  list(@Query() query: ListJobsQueryDto) {
    return this.jobsService.list(query);
  }

  @Get(':id')
  @Roles(RoleName.CUSTOMER, RoleName.FREELANCER, RoleName.ARBITER)
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.jobsService.getDetail(id);
  }

  @Delete(':id')
  @Roles(RoleName.CUSTOMER)
  remove(@Req() req: { user: AuthUser }, @Param('id', ParseIntPipe) id: number) {
    return this.jobsService.remove(id, req.user.userId);
  }
}
