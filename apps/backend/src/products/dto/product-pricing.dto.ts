import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

/** Grille tarifaire produit / pays / secteur (CDC §4.5). */
export class CreateProductPricingDto {
  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  sector?: string;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsNumber()
  @Min(0)
  unitCost!: number;
}

export class UpdateProductPricingDto extends CreateProductPricingDto {}
