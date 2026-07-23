import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class CreateContactDto {
  @ApiProperty({
    example: 'Jean',
  })
  @IsString()
  firstName!: string;

  @ApiProperty({
    example: 'Dupont',
  })
  @IsString()
  lastName!: string;

  @ApiProperty({
    example: 'jean@entreprise.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: '+2250700000000',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    example: 'Directeur Commercial',
    required: false,
  })
  @IsOptional()
  @IsString()
  jobTitle?: string;

  @ApiProperty({
    example: true,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiProperty({
    example: 'cmf5m9x6c0001abcd12345678',
  })
  @IsString()
  customerId!: string;

  @ApiProperty({
    example: 'cmf5m9x6c0002abcd12345678',
    required: false,
  })
  @IsOptional()
  @IsString()
  assignedToId?: string;
}
