import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { ProjectStatus } from '@prisma/client';

export class UpdateProjectStatusDto {
  @IsEnum(ProjectStatus)
  status!: ProjectStatus;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
