import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateInvoiceItemDto {
  @IsString()
  description!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsNumber()
  @IsPositive()
  unitPrice!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number = 0;

  @IsOptional()
  @IsUUID()
  productId?: string;
}
