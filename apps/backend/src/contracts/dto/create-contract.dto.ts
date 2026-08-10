import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

/** Création manuelle d'un contrat (cas exceptionnel — le cas nominal du
 * CDC §4.9 passe par `POST /contracts/from-purchase-order/:purchaseOrderId`). */
export class CreateContractDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  amount!: number;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsString()
  customerId!: string;
}
