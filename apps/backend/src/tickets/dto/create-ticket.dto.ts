import { IsEnum, IsOptional, IsString } from 'class-validator';

import { TicketPriority, TicketStatus } from '@prisma/client';

export class CreateTicketDto {
  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsString()
  customerId!: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;
}
