import { PartialType } from '@nestjs/swagger';
import { CreatePlanDto } from './create-plan.dto';

/** La portée (rôle ou bénéficiaire) n'est pas modifiable : changer de cible
 *  après coup rendrait illisible l'historique des commissions déjà calculées. */
export class UpdatePlanDto extends PartialType(CreatePlanDto) {}
