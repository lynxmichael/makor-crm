import { WorkflowActionType, WorkflowTrigger } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class WorkflowActionDto {
  @IsEnum(WorkflowActionType)
  type!: WorkflowActionType;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class CreateWorkflowDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(WorkflowTrigger)
  trigger!: WorkflowTrigger;

  /** Tableau de conditions ; vide = la règle s'applique toujours. */
  @IsOptional()
  @IsArray()
  conditions?: unknown[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10080)
  delayMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  maxRunsPerDay?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowActionDto)
  actions!: WorkflowActionDto[];
}
