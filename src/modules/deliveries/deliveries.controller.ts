import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
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
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req: unknown, _file: { originalname?: string }, cb: (error: Error | null, destination: string) => void) => {
          const destination = join(process.cwd(), 'uploads', 'deliveries');
          mkdirSync(destination, { recursive: true });
          cb(null, destination);
        },
        filename: (
          _req: unknown,
          file: { originalname?: string },
          cb: (error: Error | null, filename: string) => void,
        ) => {
          const safeExt = extname(file.originalname || '').toLowerCase();
          const random = Math.random().toString(36).slice(2, 10);
          cb(null, `${Date.now()}-${random}${safeExt}`);
        },
      }),
      limits: {
        fileSize: 20 * 1024 * 1024,
      },
    }),
  )
  create(
    @Param('id', ParseIntPipe) milestoneId: number,
    @Req() req: { user: AuthUser },
    @Body() dto: CreateDeliveryDto,
    @UploadedFile() file?: {
      filename: string;
      originalname: string;
      mimetype: string;
      size: number;
    },
  ) {
    const uploadedUrl = file ? `/uploads/deliveries/${file.filename}` : undefined;
    const submissionUrl = dto.submissionUrl ?? uploadedUrl;

    if (!submissionUrl) {
      throw new BadRequestException('Either submissionUrl or file must be provided');
    }

    return this.deliveriesService.create(milestoneId, req.user.userId, {
      ...dto,
      submissionUrl,
      fileName: file?.originalname,
      mimeType: file?.mimetype,
      fileSizeBytes: file?.size,
    });
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
