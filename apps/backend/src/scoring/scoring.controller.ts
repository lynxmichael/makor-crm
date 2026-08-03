import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { ScoringService } from './scoring.service';

/**
 * Scoring commercial (CDC §5 — V2). Ouvert à tout agent connecté : une
 * priorisation que le commercial ne peut pas consulter ne sert à rien.
 */
@ApiTags('Scoring')
@ApiBearerAuth()
@Controller('scoring')
@UseGuards(JwtAuthGuard)
export class ScoringController {
  constructor(private readonly scoring: ScoringService) {}

  @Get('leads/ranking')
  @ApiOperation({ summary: 'Prospects classés par priorité de traitement' })
  rankLeads(
    @CurrentUser() user: { id: string; role?: { name: string } },
    @Query('scope') scope?: string,
    @Query('limit') limit?: string,
  ) {
    // Par défaut, chacun voit son propre portefeuille ; « all » élargit à
    // toute l'équipe pour les profils qui pilotent.
    const assignedToId = scope === 'all' ? undefined : user.id;
    return this.scoring.rankLeads(assignedToId, limit ? Number(limit) : 20);
  }

  @Get('leads/:id')
  @ApiOperation({ summary: 'Score d’un prospect, avec le détail du calcul' })
  scoreLead(@Param('id') id: string) {
    return this.scoring.scoreLead(id);
  }

  @Get('deals/:id')
  @ApiOperation({ summary: 'Score de santé d’une opportunité' })
  scoreDeal(@Param('id') id: string) {
    return this.scoring.scoreDeal(id);
  }
}
