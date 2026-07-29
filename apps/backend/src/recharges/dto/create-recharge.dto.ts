import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

/** Rechargement de crédit prépayé client (cf. reporting "Réchargements",
 * "Soldes prépayés" — CDC §9). */
export class CreateRechargeDto {
  @ApiProperty()
  @IsString()
  customerId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty({ example: 500000 })
  @IsNumber()
  @Min(1)
  amount!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  date?: string;
}
