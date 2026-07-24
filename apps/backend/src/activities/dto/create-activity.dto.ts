import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { ActivityStatus, ActivityType } from '@prisma/client';

export class CreateActivityDto {
  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    enum: ActivityType,
  })
  @IsEnum(ActivityType)
  type!: ActivityType;

  @ApiProperty({
    enum: ActivityStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(ActivityStatus)
  status?: ActivityStatus;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @IsString()
  leadId?: string;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @IsString()
  dealId?: string;

  @ApiProperty()
  @IsString()
  assignedToId!: string;
}
