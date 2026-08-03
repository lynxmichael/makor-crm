import { Injectable, Logger } from '@nestjs/common';

import { MailService } from '../mail/mail.service';
import type {
  SignatureDispatchParams,
  SignatureDispatchResult,
  SignatureProvider,
} from './signature-provider.interface';

/**
 * Implémentation native — signature électronique simple.
 *
 * Le document est envoyé par e-mail avec un lien unique vers la page de
 * signature hébergée par le CRM. Aucun tiers n'intervient : la valeur
 * probante repose sur le faisceau d'indices conservé (horodatage, IP,
 * navigateur, empreinte du document), ce qui correspond au niveau « simple »
 * du règlement eIDAS.
 *
 * Pour des contrats à enjeu élevé, une signature avancée ou qualifiée exige
 * un prestataire certifié : c'est précisément ce que l'interface
 * SignatureProvider permet de brancher sans réécriture.
 */
@Injectable()
export class NativeSignatureProvider implements SignatureProvider {
  private readonly logger = new Logger(NativeSignatureProvider.name);

  constructor(private readonly mail: MailService) {}

  async dispatch(params: SignatureDispatchParams): Promise<SignatureDispatchResult> {
    await this.mail.sendMail(
      params.signerEmail,
      `Document à signer — ${params.documentName}`,
      `<p>Bonjour ${params.signerName},</p>
       <p>Le document <strong>${params.documentName}</strong> attend votre signature.</p>
       <p><a href="${params.signUrl}"
             style="display:inline-block;padding:12px 20px;background:#F39304;color:#fff;
                    border-radius:10px;text-decoration:none">Consulter et signer</a></p>
       <p style="color:#6b7089;font-size:13px">
         Ce lien vous est personnel. Il expire automatiquement passé le délai indiqué
         dans le document.
       </p>`,
    );

    this.logger.log(`Demande de signature ${params.requestId} envoyée à ${params.signerEmail}`);

    return { providerName: 'native' };
  }
}
