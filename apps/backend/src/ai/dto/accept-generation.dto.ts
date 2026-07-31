import { IsBoolean, IsOptional } from 'class-validator';

export class AcceptGenerationDto {
  @IsOptional()
  @IsBoolean()
  accepted?: boolean;
}
