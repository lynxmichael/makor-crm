import { Injectable } from '@nestjs/common';

import { MailerService } from '@nestjs-modules/mailer';

export interface MailAttachment {
  filename: string;
  content: Buffer;
}

@Injectable()
export class MailService {
  constructor(private readonly mailer: MailerService) {}

  async sendMail(
    to: string,
    subject: string,
    html: string,
    attachment?: MailAttachment,
  ) {
    return this.mailer.sendMail({
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
    return this.mailer.sendMail({
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
    return this.mailer.sendMail({
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
    return this.mailer.sendMail({
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
    return this.mailer.sendMail({
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
    return this.mailer.sendMail({
      to: email,

      subject: `Compte rendu — ${activityTitle}`,

      html: `
        <h2>Compte rendu de rendez-vous</h2>

        <h3>${activityTitle}</h3>

        <div>${reportHtml}</div>
      `,
    });
  }

  async send2faCode(email: string, code: string) {
    return this.mailer.sendMail({
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

  async sendResetPassword(email: string, link: string) {
    return this.mailer.sendMail({
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
    return this.mailer.sendMail({
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
    return this.mailer.sendMail({
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
