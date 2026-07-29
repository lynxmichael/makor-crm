import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

/** Objectif commercial assigné à un utilisateur pour une période donnée
 * (CDC §4.1, §9). */
export class CreateObjectiveDto {
  @ApiProperty()
  @IsString()
  userId!: string;

  @ApiProperty()
  @IsDateString()
  periodStart!: string;

  @ApiProperty()
  @IsDateString()
  periodEnd!: string;

  @ApiProperty({ example: 10000000 })
  @IsNumber()
  @Min(0)
  targetAmount!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  targetDeals?: number;
}
