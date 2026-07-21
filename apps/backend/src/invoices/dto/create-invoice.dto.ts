import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

import { InvoiceStatus } from '@prisma/client';

export class CreateInvoiceDto {
  @IsString()
  number!: string;

  @IsString()
  customerId!: string;

  @IsOptional()
  @IsString()
  subscriptionId?: string;

  @IsOptional()
  @IsString()
  paymentId?: string;

  @IsNumber()
  total!: number;

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
