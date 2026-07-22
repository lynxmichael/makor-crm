import { IsEnum, IsOptional, IsString } from 'class-validator';

import { NotificationType } from '@prisma/client';

export class CreateNotificationDto {
  @IsString()
  title!: string;

  @IsString()
  message!: string;

  @IsString()
  userId!: string;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;
}
