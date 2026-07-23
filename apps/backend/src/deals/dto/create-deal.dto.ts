import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { DealStage } from '@prisma/client';

export class CreateDealDto {
  @ApiProperty({
    example: 'Migration ERP vers le Cloud',
  })
  @IsString()
  title!: string;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 2500000,
  })
  @IsNumber()
  amount!: number;

  @ApiProperty({
    example: 60,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  probability?: number;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @IsDateString()
  expectedCloseDate?: string;

  @ApiProperty({
    enum: DealStage,
    required: false,
  })
  @IsOptional()
  @IsEnum(DealStage)
  stage?: DealStage;

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

  @ApiProperty()
  @IsString()
  assignedToId!: string;
}
