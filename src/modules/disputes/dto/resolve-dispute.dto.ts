import { DisputeResolution } from '@prisma/client';
import { IsEnum, IsString, MaxLength } from 'class-validator';

export class ResolveDisputeDto {
  @IsEnum(DisputeResolution)
  resolution!: DisputeResolution;

  @IsString()
  @MaxLength(2000)
  decisionNote!: string;
}
