import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateRechargeDto } from './create-recharge.dto';

/** Un rechargement n'est jamais réattribué à un autre client — seuls le
 * montant, le produit et la date restent modifiables. */
export class UpdateRechargeDto extends PartialType(
  OmitType(CreateRechargeDto, ['customerId'] as const),
) {}
