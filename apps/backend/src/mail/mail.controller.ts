import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { MailService } from './mail.service';

@ApiTags('Messagerie')
@ApiBearerAuth()
@Controller('mail')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MailController {
  constructor(private readonly mailService: MailService) {}

  /**
   * Test de configuration SMTP.
   *
   * Sans lui, la seule façon de vérifier le paramétrage est d'envoyer une
   * vraie facture à un vrai client — et de découvrir l'échec devant lui.
   * Ici, l'erreur est renvoyée telle quelle, avec son explication.
   */
  @Post('test')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Envoyer un message de test pour vérifier la configuration' })
  async test(
    @Body() body: { to?: string },
    @CurrentUser() user: { id: string; email: string },
  ) {
    // À défaut d'adresse fournie, on écrit à l'administrateur connecté :
    // c'est lui qui teste, c'est lui qui doit recevoir.
    const to = body?.to?.trim() || user.email;

    await this.mailService.sendMail(
      to,
      'MAKOR CRM — test de configuration',
      `<p>Si vous lisez ce message, l'envoi d'e-mails est correctement configuré.</p>
       <p style="color:#64748b;font-size:13px">
         Message de test émis depuis le CRM le ${new Date().toLocaleString('fr-FR')}.
       </p>`,
    );

    return { sent: true, to };
  }
}
