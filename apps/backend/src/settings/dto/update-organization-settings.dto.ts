import { IsEmail, IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateOrganizationSettingsDto {
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  rccm?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  bankAccount?: string;

  @IsOptional()
  @IsString()
  legalMentions?: string;

  @IsOptional()
  @IsIn(['CLASSIC', 'MODERN', 'MINIMAL'])
  pdfTemplate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  vatRate?: number;

  @IsOptional()
  @IsString()
  defaultCurrency?: string;
}
