import { IsEmail, IsEnum, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DirectoryEntryKind {
  CONTACT = 'CONTACT',
  LEAD = 'LEAD',
}

/**
 * Création d'une entrée d'annuaire.
 *
 * Le type décide de la table visée : un contact dépend d'un client, un
 * prospect existe seul. C'est la seule différence réelle entre les deux, et
 * elle se traduit ici par un `customerId` exigé dans un cas seulement.
 */
export class CreateDirectoryEntryDto {
  @ApiProperty({ enum: DirectoryEntryKind })
  @IsEnum(DirectoryEntryKind)
  kind!: DirectoryEntryKind;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  firstName!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  lastName!: string;

  /**
   * Obligatoire pour un contact : il n'existe pas hors d'une fiche client.
   *
   * Pas de `@IsOptional()` — il désactiverait la validation dès que la valeur
   * est absente, c'est-à-dire précisément le cas à interdire.
   */
  @ApiPropertyOptional({ description: 'Requis lorsque kind vaut CONTACT' })
  @ValidateIf((dto: CreateDirectoryEntryDto) => dto.kind === DirectoryEntryKind.CONTACT)
  @IsString({ message: 'Un contact doit être rattaché à un client.' })
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail({}, { message: 'Adresse e-mail invalide.' })
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jobTitle?: string;

  /** Prospects uniquement — un contact hérite de ceux de son client. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sector?: string;
}
