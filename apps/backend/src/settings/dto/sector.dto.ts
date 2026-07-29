import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateSectorDto {
  @IsString()
  name!: string;
}

export class UpdateSectorDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
