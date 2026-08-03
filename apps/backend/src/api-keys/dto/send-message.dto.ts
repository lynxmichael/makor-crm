import { CampaignType } from '@prisma/client';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class PartnerSendMessageDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(1000, {
    message: 'Un envoi est limité à 1000 destinataires. Découpez en plusieurs appels.',
  })
  @IsString({ each: true })
  destinations!: string[];

  @IsString()
  @MinLength(1)
  @MaxLength(1600)
  message!: string;

  @IsOptional()
  @IsEnum(CampaignType)
  type?: CampaignType;

  /** Ignoré si la clé impose déjà un Sender ID. */
  @IsOptional()
  @IsString()
  senderId?: string;
}
