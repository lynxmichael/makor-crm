import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

import {
  GatewaySendParams,
  GatewaySendResult,
  SmsWhatsappGateway,
} from './gateway-adapter.interface';

/**
 * Implémentation par défaut, sans dépendance externe : simule l'envoi et
 * journalise dans les logs applicatifs. À remplacer par un adaptateur
 * réel (Twilio, agrégateur SMS local, WhatsApp Business API...) en
 * fournissant une classe qui implémente `SmsWhatsappGateway` et en la
 * substituant dans `campaigns.module.ts` — le reste de l'application
 * (service, processeur, contrôleur) n'a besoin d'aucune modification.
 *
 * Le taux d'échec simulé (5%) permet de tester le calcul du taux de
 * délivrabilité et la détection d'anomalies sans prestataire réel.
 */
@Injectable()
export class MockGatewayAdapter implements SmsWhatsappGateway {
  private readonly logger = new Logger(MockGatewayAdapter.name);

  async send(params: GatewaySendParams): Promise<GatewaySendResult> {
    // Simule la latence réseau d'un prestataire réel.
    await new Promise((resolve) => setTimeout(resolve, 5));

    const providerMessageId = randomUUID();
    const failed = Math.random() < 0.05;

    this.logger.debug(
      `[MOCK ${params.type}] -> ${params.destination} : "${params.message.slice(0, 40)}..." ${
        failed ? '(échec simulé)' : '(accepté)'
      }`,
    );

    if (failed) {
      return {
        providerMessageId,
        accepted: false,
        errorCode: 'MOCK_TEMP_FAILURE',
      };
    }

    return {
      providerMessageId,
      accepted: true,
      cost: 15,
    };
  }
}
