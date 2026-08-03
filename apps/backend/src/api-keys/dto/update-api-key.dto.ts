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
} from 'class-validator';

/**
 * Le secret n'est pas modifiable : pour changer de clé, on révoque et on en
 * émet une nouvelle. Une rotation silencieuse casserait l'intégration du
 * partenaire sans qu'il en soit averti.
 */
export class UpdateApiKeyDto {
  @IsOptional()
  @IsString()
  name?: string;

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
  expiresAt?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
