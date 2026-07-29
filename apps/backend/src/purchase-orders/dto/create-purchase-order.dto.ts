import {
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { PurchaseOrderItemDto } from './purchase-order-item.dto';

/**
 * Création autonome d'un bon de commande (sans devis préalable). Le cas
 * nominal du CDC §4.8 — transformation d'un devis accepté — passe par
 * `POST /purchase-orders/from-quote/:quoteId`, qui ne prend en entrée que
 * le mode de règlement.
 */
export class CreatePurchaseOrderDto {
  @ApiProperty()
  @IsString()
  customerId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiProperty({ type: [PurchaseOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items!: PurchaseOrderItemDto[];
}
