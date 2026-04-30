import { IsString, MaxLength } from 'class-validator';

export class RequestDeliveryRevisionDto {
  @IsString()
  @MaxLength(2000)
  reason!: string;
}
