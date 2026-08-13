import { IsInt, IsISO8601, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateInstallmentsDto {
  /** En deçà de deux, il n'y a pas d'échelonnement. */
  @ApiProperty({ example: 3, minimum: 2, maximum: 36 })
  @IsInt()
  @Min(2)
  @Max(36)
  count!: number;

  @ApiPropertyOptional({ example: 30, description: 'Intervalle en jours (30 par défaut)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  everyDays?: number;

  @ApiPropertyOptional({ description: "Première échéance ; à défaut, l'échéance de la facture" })
  @IsOptional()
  @IsISO8601()
  firstDueDate?: string;

  @ApiPropertyOptional({ description: 'Acompte dû immédiatement, déduit du reste à échelonner' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  downPayment?: number;
}
