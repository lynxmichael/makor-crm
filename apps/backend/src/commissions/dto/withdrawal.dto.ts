import { WithdrawalStatus } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RequestWithdrawalDto {
  @ApiProperty({ example: 150000 })
  @IsNumber()
  @Min(1)
  amount!: number;

  @ApiPropertyOptional({ description: 'Motif du retrait, libre' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class RejectWithdrawalDto {
  /**
   * Motif obligatoire. Un refus sans explication est incontestable pour de
   * mauvaises raisons : le demandeur ne sait ni quoi corriger ni quoi
   * discuter.
   */
  @ApiProperty()
  @IsString()
  @MinLength(5, { message: 'Expliquez le refus en quelques mots.' })
  @MaxLength(500)
  rejectionReason!: string;
}

export class PayWithdrawalDto {
  @ApiPropertyOptional({ description: 'Moyen du versement — virement, Wave, espèces…' })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional({ description: 'Référence du versement, pour rapprochement' })
  @IsOptional()
  @IsString()
  reference?: string;
}

export class FilterWithdrawalDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsEnum(WithdrawalStatus)
  status?: WithdrawalStatus;
}
