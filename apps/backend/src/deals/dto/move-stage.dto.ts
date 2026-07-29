import { IsOptional, IsString } from 'class-validator';

export class MoveDealStageDto {
  @IsString()
  stageId!: string;

  @IsOptional()
  @IsString()
  note?: string;
}
