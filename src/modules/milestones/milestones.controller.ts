import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../shared/auth-user.type';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { MilestonesService } from './milestones.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class MilestonesController {
  constructor(private readonly milestonesService: MilestonesService) {}

  @Post('projects/:projectId/milestones')
  @Roles(RoleName.CUSTOMER)
  create(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Req() req: { user: AuthUser },
    @Body() dto: CreateMilestoneDto,
  ) {
    return this.milestonesService.create(projectId, req.user.userId, dto);
  }

  @Get('projects/:projectId/milestones')
  @Roles(RoleName.CUSTOMER, RoleName.FREELANCER, RoleName.ARBITER)
  listByProject(@Param('projectId', ParseIntPipe) projectId: number, @Req() req: { user: AuthUser }) {
    return this.milestonesService.listByProject(projectId, req.user.userId, req.user.roles);
  }

  @Patch('milestones/:id')
  @Roles(RoleName.CUSTOMER)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: AuthUser },
    @Body() dto: UpdateMilestoneDto,
  ) {
    return this.milestonesService.update(id, req.user.userId, dto);
  }
}
