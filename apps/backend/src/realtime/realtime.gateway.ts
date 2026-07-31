import { Logger, UnauthorizedException } from '@nestjs/common';

import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';

import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { OnEvent } from '@nestjs/event-emitter';

/**
 * Diffusion temps réel (CDC §2.1, §2.3) : statut des campagnes en cours
 * d'envoi, alertes d'anomalie, nouvelles notifications in-app. Chaque
 * client s'authentifie au moment de la connexion avec le même JWT que
 * l'API REST — pas de session parallèle à gérer.
 *
 * CORS aligné sur FRONTEND_URL, cohérent avec le reste de l'API.
 */
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL ?? '*',
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        client.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        throw new UnauthorizedException();
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      });

      client.data.userId = payload.sub;
      client.join(`user:${payload.sub}`);
      client.join('broadcast');

      this.logger.debug(`Client connecté : user ${payload.sub}`);
    } catch {
      client.emit('error', 'Authentification requise');
      client.disconnect(true);
    }
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    this.logger.debug(`Client déconnecté : ${client.id}`);
  }

  @SubscribeMessage('campaign:subscribe')
  subscribeToCampaign(
    @ConnectedSocket() client: Socket,
    campaignId: string,
  ) {
    client.join(`campaign:${campaignId}`);
  }

  // --- Relais des événements applicatifs vers les clients connectés ---

  @OnEvent('campaign.updated')
  onCampaignUpdated(payload: { campaignId: string; stats: unknown }) {
    this.server
      .to(`campaign:${payload.campaignId}`)
      .to('broadcast')
      .emit('campaign:updated', payload);
  }

  @OnEvent('campaign.anomaly')
  onCampaignAnomaly(payload: { campaignId: string; stats: unknown }) {
    this.server.to('broadcast').emit('campaign:anomaly', payload);
  }

  @OnEvent('notification.created')
  onNotificationCreated(notification: { userId: string }) {
    this.server
      .to(`user:${notification.userId}`)
      .emit('notification:new', notification);
  }

  /**
   * Messagerie interne (CDC §4.1). Le message part vers les deux parties :
   * le destinataire voit arriver la ligne, l'expéditeur voit son propre
   * envoi apparaître dans le fil qu'il a ouvert sur un autre onglet.
   */
  @OnEvent('message.created')
  onMessageCreated(message: { id: string; senderId: string; recipientId: string }) {
    this.server
      .to(`user:${message.recipientId}`)
      .emit('message:new', message);

    this.server
      .to(`user:${message.senderId}`)
      .emit('message:sent', message);
  }

  /** Mention dans un commentaire — seule la personne citée est prévenue. */
  @OnEvent('comment.mentioned')
  onCommentMentioned(payload: { userId: string; comment: unknown }) {
    this.server
      .to(`user:${payload.userId}`)
      .emit('comment:mentioned', payload.comment);
  }

  /**
   * Nouveau commentaire : diffusé à tous, l'interface ne rafraîchit le fil
   * que si elle affiche l'entité concernée.
   */
  @OnEvent('comment.created')
  onCommentCreated(comment: { entityType: string; entityId: string | null }) {
    this.server.to('broadcast').emit('comment:created', comment);
  }
}
