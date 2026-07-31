import { CommentEntity } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body!: string;

  @IsEnum(CommentEntity)
  entityType!: CommentEntity;

  /** Requis sauf pour les portées globales (DASHBOARD). */
  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  mentionedUserIds?: string[];
}
