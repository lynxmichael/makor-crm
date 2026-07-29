import { IsIn, IsOptional, IsString } from 'class-validator';

/**
 * Charge utile attendue du webhook de statut de livraison exposé par la
 * passerelle SMS/WhatsApp (CDC §2.2). Le champ `providerMessageId` doit
 * correspondre à celui renvoyé lors de l'envoi.
 */
export class WebhookStatusDto {
  @IsString()
  providerMessageId!: string;

  @IsIn(['DELIVERED', 'FAILED', 'REJECTED'])
  status!: 'DELIVERED' | 'FAILED' | 'REJECTED';

  @IsOptional()
  @IsString()
  errorCode?: string;
}
