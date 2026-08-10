import { CanonicalStage } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * Le pipeline est administrable depuis l'écran (D24) : les colonnes se créent,
 * se renomment, se réordonnent et se retirent sans mise en production.
 *
 * `canonicalStage` est ce qui rend cette liberté sans danger — c'est le
 * rattachement aux six étapes du CDC §4.6 sur lequel tout le reporting agrège.
 * Il est donc obligatoire à la création, et jamais optionnel « par confort ».
 */
export class CreatePipelineStageDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name!: string;

  @IsEnum(CanonicalStage, {
    message: `canonicalStage doit valoir l'une des valeurs : ${Object.values(CanonicalStage).join(', ')}`,
  })
  canonicalStage!: CanonicalStage;

  /** Omis, l'étape est ajoutée en fin de pipeline. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  order?: number;

  @IsOptional()
  @IsBoolean()
  isClosedWon?: boolean;

  @IsOptional()
  @IsBoolean()
  isClosedLost?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresSignedOrder?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, {
    message: 'color doit être une couleur hexadécimale, ex. #F39304',
  })
  color?: string;
}

/**
 * `order` est volontairement absent : réordonner une colonne isolément
 * laisserait le pipeline avec des rangs en double ou troués. Le
 * réordonnancement passe par `PATCH /pipeline-stages/reorder`, qui réécrit
 * la série complète dans une transaction.
 */
export class UpdatePipelineStageDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsEnum(CanonicalStage, {
    message: `canonicalStage doit valoir l'une des valeurs : ${Object.values(CanonicalStage).join(', ')}`,
  })
  canonicalStage?: CanonicalStage;

  @IsOptional()
  @IsBoolean()
  isClosedWon?: boolean;

  @IsOptional()
  @IsBoolean()
  isClosedLost?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresSignedOrder?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, {
    message: 'color doit être une couleur hexadécimale, ex. #F39304',
  })
  color?: string;
}

/** Nouvel ordre du pipeline, de la première colonne à la dernière. */
export class ReorderPipelineStagesDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @IsString({ each: true })
  stageIds!: string[];
}

/**
 * Retirer une colonne suppose de dire où vont les opportunités qu'elle porte
 * (D5 : un refus ou un déplacement se motive, il ne se subit pas). La
 * destination est donc exigée dès qu'il reste quelque chose à déplacer.
 *
 * En query et non en corps de requête : plusieurs intermédiaires HTTP
 * suppriment le corps d'un DELETE.
 */
export class RemovePipelineStageDto {
  @IsOptional()
  @IsString()
  destinationStageId?: string;
}

/** Les étapes archivées sont exclues par défaut (voir `PipelineStage.isArchived`). */
export class QueryPipelineStagesDto {
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeArchived?: boolean;
}
