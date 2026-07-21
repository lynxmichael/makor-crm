import {
  IsEmail,
  IsOptional,
  IsString,
  IsEnum,
} from 'class-validator';

export enum CustomerStatusDto {
  PROSPECT = 'PROSPECT',
  QUALIFIED = 'QUALIFIED',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  LOST = 'LOST',
}

export class CreateCustomerDto {
  @IsString()
  companyName!: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  sector?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  city?: string;

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
  website?: string;

  @IsOptional()
  @IsEnum(CustomerStatusDto)
  status?: CustomerStatusDto;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;
}
