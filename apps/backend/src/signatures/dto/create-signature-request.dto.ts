import { SignableEntity } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateSignatureRequestDto {
  /** Pièce à faire signer : devis, bon de commande ou contrat. */
  @IsEnum(SignableEntity)
  entityType!: SignableEntity;

  @IsString()
  entityId!: string;

  @IsString()
  @MinLength(2)
  signerName!: string;

  @IsEmail()
  signerEmail!: string;

  @IsOptional()
  @IsString()
  signerPhone?: string;

  /**
   * Durée de validité du lien, en jours (30 par défaut côté service).
   * Un lien de signature sans échéance resterait exploitable indéfiniment
   * si la boîte du destinataire venait à être compromise.
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  validityDays?: number;
}
