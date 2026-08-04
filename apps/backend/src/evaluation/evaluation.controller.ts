import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { EvaluationService } from './evaluation.service';
import { CancelActivityDto } from './dto/cancel-activity.dto';

/**
 * Évaluation des commerciaux (demande du 31/07/2026).
 *
 * La consultation est fermée au profil COMMERCIAL, conformément à la
 * demande. Retenue : un commercial n'accède pas du tout au module, plutôt
 * que d'y voir ses collègues sans se voir lui-même — dans une équipe
 * restreinte, on déduit sa propre position par soustraction, et l'option
 * intermédiaire donne l'illusion d'une confidentialité qui n'existe pas.
 *
 * L'annulation, elle, reste ouverte à tous : c'est le commercial concerné
 * qui justifie son propre rendez-vous annulé.
 */
@ApiTags('Évaluation')
@ApiBearerAuth()
@Controller('evaluation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EvaluationController {
  constructor(private readonly evaluation: EvaluationService) {}

  @Patch('activities/:id/cancel')
  @ApiOperation({ summary: 'Annuler un rendez-vous en justifiant le motif' })
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelActivityDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.evaluation.cancelActivity(id, dto, user.id);
  }

  @Get('team')
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'MANAGER')
  @ApiOperation({ summary: 'Rendez-vous pris et réalisés par commercial' })
  team(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.evaluation.teamEvaluation(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
      departmentId,
    );
  }

  @Get('cancellations/:userId')
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'MANAGER')
  @ApiOperation({ summary: 'Détail des annulations d’un commercial, motifs compris' })
  cancellations(
    @Param('userId') userId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.evaluation.cancellations(
      userId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }
}
