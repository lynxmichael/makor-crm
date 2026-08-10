import { IsOptional, IsString, MaxLength } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

/** Demande d'identifiant expéditeur SMS (CDC §4.11). Les opérateurs
 * limitent généralement le Sender ID à 11 caractères alphanumériques. */
export class CreateSenderIdRequestDto {
  @ApiProperty({ example: 'MAKORCI' })
  @IsString()
  @MaxLength(11)
  name!: string;

  @ApiProperty({
    required: false,
    description: 'Opérateur / agrégateur partenaire',
  })
  @IsOptional()
  @IsString()
  partner?: string;

  @ApiProperty()
  @IsString()
  customerId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
