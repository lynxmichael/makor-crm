import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

import { SubscriptionStatus } from '@prisma/client';

export class CreateSubscriptionDto {
  @IsString()
  customerId!: string;

  @IsString()
  offerId!: string;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;
}
