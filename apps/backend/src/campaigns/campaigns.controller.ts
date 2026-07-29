import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { CampaignsService } from './campaigns.service';

import {
  AddRecipientsDto,
  CreateCampaignDto,
} from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { WebhookStatusDto } from './dto/webhook-status.dto';

@ApiTags('Campaigns')
@Controller('campaigns')
export class CampaignsController {
  constructor(
    private readonly campaignsService: CampaignsService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Callback de statut de livraison exposé à la passerelle SMS/WhatsApp
   * (CDC §2.2). Route volontairement hors JwtAuthGuard (le prestataire
   * tiers n'a pas de session utilisateur) mais protégée par un secret
   * partagé transmis en en-tête.
   */
  @Post('webhook/delivery-status')
  @SkipThrottle()
  @ApiOperation({ summary: 'Callback de statut de livraison (passerelle)' })
  handleWebhook(
    @Body() dto: WebhookStatusDto,
    @Headers('x-webhook-secret') secret?: string,
  ) {
    const expected = this.config.get<string>('CAMPAIGNS_WEBHOOK_SECRET');

    if (expected && secret !== expected) {
      throw new ForbiddenException('Secret de webhook invalide.');
    }

    return this.campaignsService.handleWebhookStatus(dto);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer une campagne' })
  create(
    @Body() dto: CreateCampaignDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.campaignsService.create(dto, user?.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Liste des campagnes' })
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.campaignsService.findAll({
      page: Number(page),
      limit: Number(limit),
      search,
      status,
      type,
      customerId,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  findOne(@Param('id') id: string) {
    return this.campaignsService.findOne(id);
  }

  @Get(':id/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Taux de délivrabilité et volumes' })
  stats(@Param('id') id: string) {
    return this.campaignsService.stats(id);
  }

  @Get(':id/recipients')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  recipients(
    @Param('id') id: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('status') status?: string,
  ) {
    return this.campaignsService.recipients(id, {
      page: Number(page),
      limit: Number(limit),
      status,
    });
  }

  @Post(':id/recipients')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ajouter des destinataires' })
  addRecipients(@Param('id') id: string, @Body() dto: AddRecipientsDto) {
    return this.campaignsService.addRecipients(id, dto);
  }

  @Post(':id/send')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lancer l’envoi (immédiat ou différé)' })
  send(@Param('id') id: string) {
    return this.campaignsService.send(id);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  cancel(@Param('id') id: string) {
    return this.campaignsService.cancel(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  update(@Param('id') id: string, @Body() dto: UpdateCampaignDto) {
    return this.campaignsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  remove(@Param('id') id: string) {
    return this.campaignsService.remove(id);
  }
}
