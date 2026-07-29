import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FromQuoteDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
