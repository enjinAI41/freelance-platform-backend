import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class FreelancerPerformanceQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  freelancerId?: number;
}
