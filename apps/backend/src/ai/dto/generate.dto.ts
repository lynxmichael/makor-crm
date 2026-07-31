import { AiTaskType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class GenerateDto {
  @IsEnum(AiTaskType)
  taskType!: AiTaskType;

  /** Devis ou contrat concerné — sert à construire le contexte factuel. */
  @IsString()
  entityId!: string;

  /**
   * Consigne libre du commercial : ton, angle, points à mettre en avant.
   * Le contexte chiffré, lui, n'est jamais fourni par le client.
   */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  instruction?: string;
}
