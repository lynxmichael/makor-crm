import { IsOptional, IsString, MaxLength } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

/** Demande d'identifiant expéditeur SMS (CDC §4.11). Les opérateurs
 * limitent généralement le Sender ID à 11 caractères alphanumériques. */
export class CreateSenderIdRequestDto {
  @ApiProperty({ example: 'MAKORCI' })
  @IsString()
  @MaxLength(11)
  name!: string;

  @ApiProperty({ required: false, description: 'Opérateur / agrégateur partenaire' })
  @IsOptional()
  @IsString()
  partner?: string;

  /**
   * Pays de l'opérateur (demande du 07/08/2026).
   *
   * L'homologation d'un Sender ID se fait pays par pays : la même demande
   * doit être reprise auprès de chaque régulateur, et son statut peut donc
   * différer d'un pays à l'autre.
   */
  @ApiProperty({ required: false, example: "Côte d'Ivoire" })
  @IsOptional()
  @IsString()
  partnerCountry?: string;

  @ApiProperty()
  @IsString()
  customerId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
