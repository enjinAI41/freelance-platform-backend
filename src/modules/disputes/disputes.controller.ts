import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../shared/auth-user.type';
import { AssignArbiterDto } from './dto/assign-arbiter.dto';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ListDisputesQueryDto } from './dto/list-disputes-query.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { DisputesService } from './disputes.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Post('projects/:projectId/disputes')
  @Roles(RoleName.CUSTOMER, RoleName.FREELANCER)
  create(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Req() req: { user: AuthUser },
    @Body() dto: CreateDisputeDto,
  ) {
    return this.disputesService.create(projectId, req.user.userId, dto);
  }

  @Get('disputes')
  @Roles(RoleName.CUSTOMER, RoleName.FREELANCER, RoleName.ARBITER)
  list(@Req() req: { user: AuthUser }, @Query() query: ListDisputesQueryDto) {
    return this.disputesService.list(req.user.userId, req.user.roles, query);
  }

  @Get('disputes/:id')
  @Roles(RoleName.CUSTOMER, RoleName.FREELANCER, RoleName.ARBITER)
  getDetail(@Param('id', ParseIntPipe) id: number, @Req() req: { user: AuthUser }) {
    return this.disputesService.getDetail(id, req.user.userId, req.user.roles);
  }

  @Patch('disputes/:id/resolve')
  @Roles(RoleName.ARBITER)
  resolve(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: AuthUser },
    @Body() dto: ResolveDisputeDto,
  ) {
    return this.disputesService.resolve(id, req.user.userId, req.user.roles, dto);
  }

  @Patch('disputes/:id/assign')
  @Roles(RoleName.ARBITER)
  assignArbiter(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: AuthUser },
    @Body() dto: AssignArbiterDto,
  ) {
    return this.disputesService.assignArbiter(id, req.user.userId, req.user.roles, dto);
  }

  @Patch('disputes/:id/cancel')
  @Roles(RoleName.CUSTOMER, RoleName.FREELANCER)
  cancel(@Param('id', ParseIntPipe) id: number, @Req() req: { user: AuthUser }) {
    return this.disputesService.cancel(id, req.user.userId);
  }
}
