import { IsString } from 'class-validator';

export class RejectSenderIdDto {
  @IsString()
  reason!: string;
}
