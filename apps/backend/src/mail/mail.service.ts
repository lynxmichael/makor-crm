import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

import { MailerService } from '@nestjs-modules/mailer';
import type { ISendMailOptions } from '@nestjs-modules/mailer';

export interface MailAttachment {
  filename: string;
  content: Buffer;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly mailer: MailerService,
  ) {}

  /**
   * Envoi effectif, avec traduction des erreurs SMTP.
   *
   * Nodemailer remonte des codes bruts et une trace de plusieurs dizaines de
   * lignes. Telle quelle, l'erreur arrive à l'écran sous forme de 500
   * illisible : l'utilisateur voit « échec » sans savoir que c'est sa
   * configuration qui est en cause, ni laquelle.
   *
   * On la transforme donc en message actionnable, tout en conservant la trace
   * complète dans les journaux du serveur pour le diagnostic.
   */
  private async deliver(options: ISendMailOptions) {
    try {
      return await this.mailer.sendMail(options);
    } catch (error) {
      const err = error as { code?: string; responseCode?: number; message?: string };

      this.logger.error(
        `Échec d'envoi vers ${String(options.to)} : ${err.code ?? ''} ${err.message ?? ''}`,
      );

      throw new ServiceUnavailableException(this.explain(err));
    }
  }

  /** Traduction des échecs SMTP les plus fréquents. */
  private explain(err: { code?: string; responseCode?: number; message?: string }): string {
    const message = err.message ?? '';

    // Gmail refuse le mot de passe de compte dès que la double
    // authentification est active : il faut un mot de passe d'application.
    if (err.responseCode === 534 || /application-specific password/i.test(message)) {
      return (
        'Le serveur de messagerie refuse le mot de passe fourni. Avec Gmail et la double ' +
        'authentification, un mot de passe de compte ne fonctionne pas : générez un ' +
        '« mot de passe d’application » de 16 caractères dans les paramètres de sécurité ' +
        'Google et placez-le dans MAIL_PASSWORD.'
      );
    }

    if (err.code === 'EAUTH' || err.responseCode === 535) {
      return (
        'Identifiants de messagerie refusés. Vérifiez MAIL_USER et MAIL_PASSWORD dans le ' +
        'fichier .env du serveur, puis redémarrez-le.'
      );
    }

    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'EDNS') {
      return (
        'Serveur de messagerie injoignable. Vérifiez MAIL_HOST et MAIL_PORT — et que le ' +
        'serveur a bien accès à Internet.'
      );
    }

    if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKET') {
      return (
        'La connexion au serveur de messagerie a expiré. Le port est peut-être bloqué par ' +
        'un pare-feu, ou le mode de chiffrement ne correspond pas au port : 465 exige TLS ' +
        'dès la connexion, 587 passe par STARTTLS.'
      );
    }

    if (err.responseCode === 550 || err.responseCode === 553) {
      return (
        'Message refusé par le serveur destinataire. L’adresse d’expédition (MAIL_FROM) doit ' +
        'correspondre au compte authentifié.'
      );
    }

    return `L'envoi a échoué : ${message || 'erreur inconnue du serveur de messagerie'}.`;
  }

  async sendMail(
    to: string,
    subject: string,
    html: string,
    attachment?: MailAttachment,
  ) {
    return this.deliver({
      to,
      subject,
      html,
      attachments: attachment ? [attachment] : undefined,
    });
  }

  async sendInvoice(
    email: string,
    invoiceNumber: string,
    total: number,
    attachment?: MailAttachment,
  ) {
    return this.deliver({
      to: email,

      subject: `Facture ${invoiceNumber}`,

      html: `
        <h2>Facture</h2>

        <p>Votre facture est disponible.</p>

        <b>Numéro :</b> ${invoiceNumber}<br>

        <b>Montant :</b> ${total} FCFA
      `,

      attachments: attachment ? [attachment] : undefined,
    });
  }

  async sendQuote(
    email: string,
    quoteNumber: string,
    attachment?: MailAttachment,
  ) {
    return this.deliver({
      to: email,

      subject: `Devis ${quoteNumber}`,

      html: `
        <h2>Nouveau devis</h2>

        <p>Votre devis ${quoteNumber} est prêt, vous le trouverez en pièce
        jointe.</p>
      `,

      attachments: attachment ? [attachment] : undefined,
    });
  }

  async sendPurchaseOrder(
    email: string,
    orderNumber: string,
    attachment?: MailAttachment,
  ) {
    return this.deliver({
      to: email,

      subject: `Bon de commande ${orderNumber}`,

      html: `
        <h2>Bon de commande</h2>

        <p>Merci de confirmer votre commande ${orderNumber} en signant le
        document ci-joint puis en le retournant par retour d'email.</p>
      `,

      attachments: attachment ? [attachment] : undefined,
    });
  }

  async sendContract(
    email: string,
    contractNumber: string,
    attachment?: MailAttachment,
  ) {
    return this.deliver({
      to: email,

      subject: `Contrat ${contractNumber}`,

      html: `
        <h2>Contrat</h2>

        <p>Votre contrat ${contractNumber} est disponible en pièce
        jointe.</p>
      `,

      attachments: attachment ? [attachment] : undefined,
    });
  }

  async sendActivityReport(
    email: string,
    activityTitle: string,
    reportHtml: string,
  ) {
    return this.deliver({
      to: email,

      subject: `Compte rendu — ${activityTitle}`,

      html: `
        <h2>Compte rendu de rendez-vous</h2>

        <h3>${activityTitle}</h3>

        <div>${reportHtml}</div>
      `,
    });
  }


  /**
   * Notification du CRM relayée par e-mail.
   *
   * Le message reprend exactement le libellé affiché dans l'application : deux
   * formulations différentes pour le même événement obligeraient à
   * réinterpréter, et feraient douter qu'il s'agisse bien de la même chose.
   *
   * Le lien renvoie vers le CRM plutôt que de tout détailler : l'e-mail
   * signale, il ne remplace pas l'outil.
   */
  async sendNotification(
    to: string,
    notification: { title: string; message: string; type?: string },
    link?: string,
  ) {
    const accent =
      notification.type === 'ERROR'
        ? '#DC2626'
        : notification.type === 'WARNING'
          ? '#F39304'
          : notification.type === 'SUCCESS'
            ? '#16A34A'
            : '#0A4A78';

    return this.deliver({
      to,
      subject: `MAKOR CRM — ${notification.title}`,
      html: `
        <div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px">
          <div style="border-left:3px solid ${accent};padding:0 0 0 14px">
            <h2 style="margin:0 0 6px;font-size:17px;color:#1A1B2E">
              ${notification.title}
            </h2>
            <p style="margin:0;font-size:15px;line-height:1.55;color:#334155">
              ${notification.message}
            </p>
          </div>

          ${
            link
              ? `<p style="margin:22px 0 0">
                   <a href="${link}"
                      style="display:inline-block;background:#F39304;color:#fff;
                             text-decoration:none;padding:10px 18px;border-radius:8px;
                             font-size:14px">Ouvrir dans le CRM</a>
                 </p>`
              : ''
          }

          <p style="margin:26px 0 0;font-size:12px;color:#94A3B8">
            Vous recevez ce message parce que les notifications par e-mail sont
            actives sur votre compte. Vous pouvez les désactiver dans vos
            paramètres.
          </p>
        </div>
      `,
    });
  }

  async send2faCode(email: string, code: string) {
    return this.deliver({
      to: email,

      subject: 'Votre code de vérification',

      html: `
        <h2>Vérification en deux étapes</h2>

        <p>Votre code de vérification :</p>

        <h1 style="letter-spacing:4px">${code}</h1>

        <p>Ce code expire dans 5 minutes. Si vous n'êtes pas à l'origine de
        cette demande, changez votre mot de passe immédiatement.</p>
      `,
    });
  }

  async sendResetPassword(
    email: string,
    link: string,
  ) {
    return this.deliver({
      to: email,

      subject: 'Réinitialisation du mot de passe',

      html: `
        <p>Une demande de réinitialisation de mot de passe a été effectuée
        pour votre compte MAKOR CRM.</p>

        <a href="${link}">
          Réinitialiser le mot de passe
        </a>

        <p>Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de
        cette demande, ignorez cet email.</p>
      `,
    });
  }

  async sendAccountLocked(email: string) {
    return this.deliver({
      to: email,

      subject: 'Votre compte a été verrouillé',

      html: `
        <h2>Compte temporairement verrouillé</h2>

        <p>Votre compte MAKOR CRM a été verrouillé pendant 15 minutes suite
        à plusieurs tentatives de connexion échouées. Si vous n'êtes pas à
        l'origine de ces tentatives, contactez votre administrateur.</p>
      `,
    });
  }

  async sendSenderIdStatusUpdate(
    email: string,
    senderIdName: string,
    status: string,
  ) {
    return this.deliver({
      to: email,

      subject: `Sender ID "${senderIdName}" — ${status}`,

      html: `
        <h2>Mise à jour de votre demande Sender ID</h2>

        <p>La demande d'identifiant expéditeur <b>${senderIdName}</b> est
        désormais : <b>${status}</b>.</p>
      `,
    });
  }
}
