import { IsEnum, IsOptional, IsString } from 'class-validator';

import { CampaignStatus, CampaignType } from '@prisma/client';

export class CreateCampaignDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsString()
  message!: string;

  @IsEnum(CampaignType)
  type: CampaignType;

  @IsString()
  companyId!: string;

  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @IsOptional()
  @IsString()
  scheduledAt?: string;
}
