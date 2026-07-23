import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateQuoteItemDto {
  @IsString()
  description!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsNumber()
  unitPrice!: number;

  @IsOptional()
  @IsNumber()
  discount?: number;

  @IsOptional()
  @IsString()
  productId?: string;
}
