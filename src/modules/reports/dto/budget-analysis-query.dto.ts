import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class BudgetAnalysisQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  projectId?: number;
}
