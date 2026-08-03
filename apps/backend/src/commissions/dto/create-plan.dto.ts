import { CommissionBase, CommissionTrigger } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePlanDto {
  @IsString()
  @MinLength(2)
  name!: string;

  /** Fraction : 0,05 pour 5 %. */
  @IsNumber()
  @Min(0)
  @Max(1)
  rate!: number;

  @IsOptional()
  @IsEnum(CommissionBase)
  base?: CommissionBase;

  @IsOptional()
  @IsEnum(CommissionTrigger)
  trigger?: CommissionTrigger;

  /** Barème de rôle. Ignoré si `userId` est fourni. */
  @IsOptional()
  @IsString()
  roleId?: string;

  /** Barème nominatif — prime sur celui du rôle. */
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  capAmount?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
