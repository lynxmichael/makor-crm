import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class PurchaseOrderItemDto {
  @IsString()
  description!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsNumber()
  unitPrice!: number;

  @IsOptional()
  @IsString()
  productId?: string;
}
