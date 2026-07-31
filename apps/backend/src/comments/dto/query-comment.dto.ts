import { Transform } from 'class-transformer';

import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

import { CommentEntity } from '@prisma/client';

export class QueryCommentDto {
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  limit = 20;

  @IsOptional()
  @IsEnum(CommentEntity)
  entityType?: CommentEntity;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
