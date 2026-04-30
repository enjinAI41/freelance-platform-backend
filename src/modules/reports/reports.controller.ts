import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../shared/auth-user.type';
import { BudgetAnalysisQueryDto } from './dto/budget-analysis-query.dto';
import { FreelancerPerformanceQueryDto } from './dto/freelancer-performance-query.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard-summary')
  @Roles(RoleName.CUSTOMER, RoleName.FREELANCER, RoleName.ARBITER)
  getDashboardSummary(@Req() req: { user: AuthUser }) {
    return this.reportsService.getDashboardSummary(req.user.userId, req.user.roles);
  }

  @Get('freelancer-performance')
  @Roles(RoleName.CUSTOMER, RoleName.FREELANCER, RoleName.ARBITER)
  getFreelancerPerformance(
    @Req() req: { user: AuthUser },
    @Query() query: FreelancerPerformanceQueryDto,
  ) {
    return this.reportsService.getFreelancerPerformance(req.user.userId, req.user.roles, query.freelancerId);
  }

  @Get('budget-analysis')
  @Roles(RoleName.CUSTOMER, RoleName.FREELANCER, RoleName.ARBITER)
  getBudgetAnalysis(@Req() req: { user: AuthUser }, @Query() query: BudgetAnalysisQueryDto) {
    return this.reportsService.getBudgetAnalysis(req.user.userId, req.user.roles, query.projectId);
  }
}
