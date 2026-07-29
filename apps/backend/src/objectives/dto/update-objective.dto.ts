import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateObjectiveDto } from './create-objective.dto';

export class UpdateObjectiveDto extends PartialType(
  OmitType(CreateObjectiveDto, ['userId'] as const),
) {}
