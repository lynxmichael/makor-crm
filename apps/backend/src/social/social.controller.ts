import { Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SocialSource } from '@prisma/client';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { SocialService } from './social.service';

/**
 * Veille des réseaux sociaux (demande du 13/08/2026).
 *
 * Réservé aux profils qui pilotent la communication : ce sont des actualités
 * de marque, pas un outil de travail commercial. Le fil est commun à
 * l'entreprise — il provient d'une boîte unique, pas de comptes personnels.
 */
@ApiTags('Veille sociale')
@ApiBearerAuth()
@Controller('social')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR')
export class SocialController {
  constructor(private readonly social: SocialService) {}

  @Get()
  @ApiOperation({ summary: 'Fil des actualités reçues des plateformes' })
  findAll(@Query('source') source?: SocialSource, @Query('unread') unread?: string) {
    return this.social.findAll({ source, unreadOnly: unread === '1' });
  }

  // Littéral avant paramétré : la règle vaut même quand les chemins ne se
  // recouvrent pas aujourd'hui, un segment ajouté plus tard suffirait à
  // créer la collision.
  @Patch('read-all')
  @ApiOperation({ summary: 'Tout marquer comme lu' })
  markAllRead(@Query('source') source?: SocialSource) {
    return this.social.markAllRead(source);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marquer une actualité comme lue' })
  markRead(@Param('id') id: string) {
    return this.social.markRead(id);
  }

  @Delete('purge')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Purger les actualités lues de plus de N jours' })
  purge(@Query('days') days = '90') {
    return this.social.purgeOlderThan(Number(days) || 90);
  }
}
