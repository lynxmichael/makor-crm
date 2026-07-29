import { CampaignType } from '@prisma/client';

export interface GatewaySendResult {
  /** Identifiant du message côté passerelle — utilisé pour rapprocher le
   * webhook de statut de livraison avec le bon destinataire. */
  providerMessageId: string;
  accepted: boolean;
  errorCode?: string;
  cost?: number;
}

export interface GatewaySendParams {
  destination: string;
  message: string;
  type: CampaignType;
  senderId?: string;
}

/**
 * Couche d'abstraction vers le(s) prestataire(s) SMS / WhatsApp (CDC
 * §2.2). Aucune autre partie du code ne doit connaître le prestataire
 * réel : changer d'agrégateur se fait en remplaçant l'implémentation
 * fournie à ce jeton, sans toucher au reste de l'application.
 */
export const SMS_WHATSAPP_GATEWAY = Symbol('SMS_WHATSAPP_GATEWAY');

export interface SmsWhatsappGateway {
  send(params: GatewaySendParams): Promise<GatewaySendResult>;
}
