import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { ActivityStatus, ActivityType } from '@prisma/client';

export class CreateActivityDto {
  @ApiProperty({ example: 'Démonstration API SMS' })
  @IsString()
  title!: string;

  /**
   * Obligatoire pour un rendez-vous (demande du 07/08/2026).
   *
   * Un rendez-vous sans objet écrit ne dit rien à qui le relit trois semaines
   * plus tard, ni au superviseur qui suit l'activité de l'équipe. Les autres
   * types — appel, tâche, note — restent libres : y imposer un texte serait
   * de la friction sans contrepartie.
   */
  @ApiProperty({
    required: false,
    description: 'Obligatoire lorsque le type est MEETING',
  })
  @ValidateIf((dto: CreateActivityDto) => dto.type === ActivityType.MEETING)
  @IsString()
  @MinLength(10, {
    message: 'Décrivez l’objet du rendez-vous en une phrase au moins.',
  })
  // Pas de `@IsOptional()` ici : il désactiverait toute validation dès que la
  // valeur est absente, ce qui laisserait passer précisément le cas qu'on
  // veut interdire. `@ValidateIf` suffit — il ignore le champ pour les
  // autres types d'activité.
  description?: string;

  @ApiProperty({ required: false, description: 'Lieu du rendez-vous' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ enum: ActivityType })
  @IsEnum(ActivityType)
  type!: ActivityType;

  @ApiProperty({ enum: ActivityStatus, required: false })
  @IsOptional()
  @IsEnum(ActivityStatus)
  status?: ActivityStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  leadId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  dealId?: string;

  @ApiProperty()
  @IsString()
  assignedToId!: string;
}
