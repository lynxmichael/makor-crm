import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { CampaignType } from '@prisma/client';

export class CreateCampaignDto {
  @ApiProperty({ example: 'Relance clients inactifs — Août 2026' })
  @IsString()
  name!: string;

  @ApiProperty({ required: false, description: 'Objet (campagnes email)' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({ example: 'Bonjour {{prenom}}, ...' })
  @IsString()
  message!: string;

  @ApiProperty({ enum: CampaignType })
  @IsEnum(CampaignType)
  type!: CampaignType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty({
    required: false,
    description: 'Client unique ciblé (campagne individuelle)',
  })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiProperty({
    required: false,
    description:
      'Cibles explicites (numéros / emails). Alternative ou complément à targetCustomerIds.',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  destinations?: string[];

  @ApiProperty({
    required: false,
    description:
      'Clients ciblés — le téléphone (SMS/WhatsApp) ou l\'email (EMAIL) de chacun devient un destinataire.',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  targetCustomerIds?: string[];
}

export class AddRecipientsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  destinations!: string[];
}
