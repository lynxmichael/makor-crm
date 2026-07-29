import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CreateCountryDto {
  @IsString()
  name!: string;

  @IsString()
  @Length(2, 2)
  code!: string;
}

export class UpdateCountryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  code?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
