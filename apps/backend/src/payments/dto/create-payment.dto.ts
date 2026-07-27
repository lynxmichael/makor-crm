import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

import { PaymentMethod } from '@prisma/client';

export class CreatePaymentDto {
  @IsNumber()
  amount!: number;

  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @IsString()
  invoiceId!: string;

  @IsString()
  customerId!: string;

  @IsOptional()
  @IsString()
  createdById?: string;
}
