import { ApiScope } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @MinLength(2)
  name!: string;

  /** Client pour le compte duquel le partenaire émet. */
  @IsString()
  customerId!: string;

  @IsOptional()
  @IsArray()
  @IsEnum(ApiScope, { each: true })
  scopes?: ApiScope[];

  @IsOptional()
  @IsString()
  senderId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  rateLimitPerMinute?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  /** Clé de test : préfixe `mk_test_`, pour distinguer les intégrations en cours. */
  @IsOptional()
  @IsBoolean()
  testMode?: boolean;
}
