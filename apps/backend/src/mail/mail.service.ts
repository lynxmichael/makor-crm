import { Injectable } from '@nestjs/common';

import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(
    private readonly mailer: MailerService,
  ) {}

  async sendMail(
    to: string,
    subject: string,
    html: string,
  ) {
    return this.mailer.sendMail({
      to,
      subject,
      html,
    });
  }

  async sendInvoice(
    email: string,
    invoiceNumber: string,
    total: number,
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
    });
  }

  async sendQuote(
    email: string,
    quoteNumber: string,
  ) {
    return this.mailer.sendMail({
      to: email,

      subject: `Devis ${quoteNumber}`,

      html: `
        <h2>Nouveau devis</h2>

        <p>Votre devis est prêt.</p>
      `,
    });
  }

  async sendContract(
    email: string,
    contractNumber: string,
  ) {
    return this.mailer.sendMail({
      to: email,

      subject: `Contrat ${contractNumber}`,

      html: `
        <h2>Contrat</h2>

        <p>Votre contrat est disponible.</p>
      `,
    });
  }

  async sendResetPassword(
    email: string,
    link: string,
  ) {
    return this.mailer.sendMail({
      to: email,

      subject: 'Réinitialisation du mot de passe',

      html: `
        <a href="${link}">
          Réinitialiser le mot de passe
        </a>
      `,
    });
  }
}
