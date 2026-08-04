import { CancellationReason } from '@prisma/client';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

export class CancelActivityDto {
  @IsEnum(CancellationReason)
  reason!: CancellationReason;

  /**
   * Explication libre, exigée en plus du motif : une catégorie seule ne dit
   * pas ce qui s'est passé, et c'est ce détail qui rend l'indicateur
   * exploitable en revue d'équipe.
   */
  @IsString()
  @MinLength(10, { message: 'Expliquez l’annulation en une phrase au moins.' })
  @MaxLength(500)
  note!: string;
}
