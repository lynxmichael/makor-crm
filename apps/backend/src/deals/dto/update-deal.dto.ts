import { PartialType } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';

import { CreateDealDto } from './create-deal.dto';

export class UpdateDealDto extends PartialType(CreateDealDto) {
  /**
   * Réponses à la grille de qualification, une clé par question sous la
   * forme `<etape>.<champ>`. Le contenu n'est pas validé champ par champ :
   * les questions sont du référentiel métier, susceptible d'évoluer sans
   * redéploiement.
   */
  @IsOptional()
  @IsObject()
  qualification?: Record<string, string>;

  @IsOptional()
  @IsObject()
  goLiveChecklist?: Record<string, boolean>;
}
