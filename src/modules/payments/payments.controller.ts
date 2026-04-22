import { Body, Controller, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../shared/auth-user.type';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post(':id/release')
  @Roles(RoleName.CUSTOMER)
  release(@Param('id', ParseIntPipe) id: number, @Req() req: { user: AuthUser }) {
    return this.paymentsService.release(id, req.user.userId);
  }

  @Patch(':id/refund')
  @Roles(RoleName.CUSTOMER)
  refund(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: AuthUser },
    @Body() dto: RefundPaymentDto,
  ) {
    return this.paymentsService.refund(id, req.user.userId, dto);
  }
}
