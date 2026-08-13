import { ExpenseCategory, ExpenseStatus } from '@prisma/client';
import {
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExpenseDto {
  @ApiProperty({ enum: ExpenseCategory })
  @IsEnum(ExpenseCategory)
  category!: ExpenseCategory;

  @ApiProperty({ example: 'Abidjan → Yamoussoukro' })
  @IsString()
  @MinLength(3, { message: 'Décrivez la dépense en quelques mots.' })
  @MaxLength(200)
  label!: string;

  @ApiProperty({ example: 45000 })
  @IsNumber()
  @Min(1)
  amount!: number;

  @ApiProperty()
  @IsISO8601()
  spentAt!: string;

  @ApiPropertyOptional({ description: 'Client concerné, si la dépense s’y rattache' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  /** Justificatif facultatif — le reçu n'est pas toujours disponible. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  receiptPath?: string;
}

export class UpdateExpenseDto {
  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  label?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  amount?: number;

  @IsOptional()
  @IsISO8601()
  spentAt?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsString()
  receiptPath?: string;
}

export class RejectExpenseDto {
  @ApiProperty()
  @IsString()
  @MinLength(5, { message: 'Expliquez le refus en quelques mots.' })
  @MaxLength(500)
  rejectionReason!: string;
}

export class ReimburseExpenseDto {
  @ApiPropertyOptional({ description: 'Virement, Wave, espèces…' })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional({ description: 'Référence, pour le rapprochement' })
  @IsOptional()
  @IsString()
  reference?: string;
}

export class FilterExpenseDto {
  @IsOptional()
  @IsEnum(ExpenseStatus)
  status?: ExpenseStatus;

  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
