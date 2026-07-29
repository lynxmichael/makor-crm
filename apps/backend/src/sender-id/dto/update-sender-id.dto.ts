import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateSenderIdRequestDto } from './create-sender-id.dto';

export class UpdateSenderIdRequestDto extends PartialType(
  OmitType(CreateSenderIdRequestDto, ['customerId'] as const),
) {}
