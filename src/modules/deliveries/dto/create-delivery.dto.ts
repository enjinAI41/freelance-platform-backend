import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateDeliveryDto {
  @IsUrl()
  @MaxLength(500)
  submissionUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
