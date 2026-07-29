import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class CreatePipelineStageDto {
  @IsString()
  name!: string;

  @IsInt()
  order!: number;

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
  color?: string;
}

export class UpdatePipelineStageDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
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
  color?: string;
}
