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
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { RequestDeliveryRevisionDto } from './dto/request-delivery-revision.dto';
import { DeliveriesService } from './deliveries.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Post('milestones/:id/deliveries')
  @Roles(RoleName.FREELANCER)
  create(
    @Param('id', ParseIntPipe) milestoneId: number,
    @Req() req: { user: AuthUser },
    @Body() dto: CreateDeliveryDto,
  ) {
    return this.deliveriesService.create(milestoneId, req.user.userId, dto);
  }

  @Get('milestones/:id/deliveries')
  @Roles(RoleName.CUSTOMER, RoleName.FREELANCER, RoleName.ARBITER)
  listByMilestone(@Param('id', ParseIntPipe) milestoneId: number, @Req() req: { user: AuthUser }) {
    return this.deliveriesService.listByMilestone(milestoneId, req.user.userId, req.user.roles);
  }

  @Patch('deliveries/:id/approve')
  @Roles(RoleName.CUSTOMER)
  approve(@Param('id', ParseIntPipe) id: number, @Req() req: { user: AuthUser }) {
    return this.deliveriesService.approve(id, req.user.userId);
  }

  @Patch('deliveries/:id/revision')
  @Roles(RoleName.CUSTOMER)
  requestRevision(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: AuthUser },
    @Body() dto: RequestDeliveryRevisionDto,
  ) {
    return this.deliveriesService.requestRevision(id, req.user.userId, dto);
  }
}
