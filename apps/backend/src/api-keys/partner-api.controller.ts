import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ApiScope } from '@prisma/client';

import { ApiKeyGuard } from './guards/api-key.guard';
import { Scopes } from './decorators/scopes.decorator';
import { PartnerApiService, type ApiKeyContext } from './partner-api.service';
import { PartnerSendMessageDto } from './dto/send-message.dto';

/**
 * API publique destinée aux partenaires (CDC §5 — V2).
 *
 * Authentification par clé dans l'en-tête `x-api-key`, jamais par JWT : un
 * partenaire est une application, pas un utilisateur du CRM. Les routes sont
 * regroupées sous `/partner` pour que la frontière soit lisible aussi bien
 * dans le code que dans les journaux d'accès.
 */
@ApiTags('API partenaires')
@ApiSecurity('api-key')
@Controller('partner')
@UseGuards(ApiKeyGuard)
export class PartnerApiController {
  constructor(private readonly partnerApi: PartnerApiService) {}

  @Post('messages')
  @Scopes(ApiScope.MESSAGES_SEND)
  @ApiOperation({ summary: 'Envoyer un message à un ou plusieurs destinataires' })
  send(@Body() dto: PartnerSendMessageDto, @Req() request: { apiKey: ApiKeyContext }) {
    return this.partnerApi.sendMessages(dto, request.apiKey);
  }

  @Get('messages/:id')
  @Scopes(ApiScope.MESSAGES_READ)
  @ApiOperation({ summary: 'Statut de livraison d’un message' })
  status(@Param('id') id: string, @Req() request: { apiKey: ApiKeyContext }) {
    return this.partnerApi.messageStatus(id, request.apiKey);
  }

  @Get('balance')
  @Scopes(ApiScope.BALANCE_READ)
  @ApiOperation({ summary: 'Solde du compte de messagerie' })
  balance(@Req() request: { apiKey: ApiKeyContext }) {
    return this.partnerApi.balance(request.apiKey);
  }
}
