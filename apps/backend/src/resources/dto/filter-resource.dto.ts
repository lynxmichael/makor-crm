import { ResourceCategory, ResourceType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class FilterResourceDto {
  @IsOptional()
  @IsEnum(ResourceCategory)
  category?: ResourceCategory;

  @IsOptional()
  @IsEnum(ResourceType)
  type?: ResourceType;

  @IsOptional()
  @IsString()
  search?: string;
}
