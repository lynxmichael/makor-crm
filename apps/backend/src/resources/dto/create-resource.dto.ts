import { ResourceCategory, ResourceType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateResourceDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsEnum(ResourceCategory)
  category?: ResourceCategory;

  @IsOptional()
  @IsEnum(ResourceType)
  type?: ResourceType;

  /** Requis pour les types VIDEO et LIEN. */
  @IsOptional()
  @IsUrl({ require_protocol: true })
  url?: string;

  /** Requis pour le type ARTICLE. */
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  position?: number;

  // Envoyé en multipart : la valeur arrive en chaîne, d'où la conversion.
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPublished?: boolean;
}
