import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateBidDto {
  @IsOptional()
  @IsString()
  coverLetter?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  proposedAmount!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  deliveryDays?: number;
}
