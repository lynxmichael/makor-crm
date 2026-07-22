import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateOfferDto {
  @IsString()
  name!: string;

  @IsString()
  code!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  price!: number;

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsString()
  productId!: string;

  @IsString()
  companyId!: string;
}
