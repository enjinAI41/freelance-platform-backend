import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../shared/auth-user.type';
import { ProjectsService } from './projects.service';
import { ListProjectsQueryDto } from './dto/list-projects-query.dto';
import { UpdateProjectStatusDto } from './dto/update-project-status.dto';

@Controller('projects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post('from-bid/:bidId')
  @Roles(RoleName.CUSTOMER)
  createFromBid(@Param('bidId', ParseIntPipe) bidId: number, @Req() req: { user: AuthUser }) {
    return this.projectsService.createFromBid(bidId, req.user.userId);
  }

  @Get()
  @Roles(RoleName.CUSTOMER, RoleName.FREELANCER)
  list(@Req() req: { user: AuthUser }, @Query() query: ListProjectsQueryDto) {
    return this.projectsService.listForUser(req.user.userId, req.user.roles, query);
  }

  @Get(':id')
  @Roles(RoleName.CUSTOMER, RoleName.FREELANCER, RoleName.ARBITER)
  getDetail(@Param('id', ParseIntPipe) id: number, @Req() req: { user: AuthUser }) {
    return this.projectsService.getDetail(id, req.user.userId, req.user.roles);
  }

  @Patch(':id/status')
  @Roles(RoleName.CUSTOMER)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: AuthUser },
    @Body() dto: UpdateProjectStatusDto,
  ) {
    return this.projectsService.updateStatus(id, req.user.userId, dto);
  }
}
