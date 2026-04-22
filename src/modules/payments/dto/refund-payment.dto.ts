import { IsString, MaxLength } from 'class-validator';

export class RefundPaymentDto {
  @IsString()
  @MaxLength(2000)
  reason!: string;
}
