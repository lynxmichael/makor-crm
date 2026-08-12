import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CommissionStatus } from '@prisma/client';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { CommissionsService } from './commissions.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { ComputeCommissionsDto } from './dto/compute-commissions.dto';
import { WithdrawalsService } from './withdrawals.service';
import {
  FilterWithdrawalDto,
  PayWithdrawalDto,
  RejectWithdrawalDto,
  RequestWithdrawalDto,
} from './dto/withdrawal.dto';

/**
 * Commissions (CDC §5 — V2).
 *
 * Barèmes et validation relèvent de la direction commerciale et du service
 * financier. Chaque agent accède en revanche à ses propres lignes via
 * `/commissions/mine` : une rémunération variable qu'on ne peut pas
 * consulter soi-même engendre plus de contestations qu'elle n'en évite.
 */
@ApiTags('Commissions')
@ApiBearerAuth()
@Controller('commissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CommissionsController {
  constructor(
    private readonly commissionsService: CommissionsService,
    private readonly withdrawals: WithdrawalsService,
  ) {}

  @Get('mine')
  @ApiOperation({ summary: 'Mes propres commissions' })
  mine(@CurrentUser() user: { id: string }) {
    return this.commissionsService.mine(user.id);
  }

  // -------------------------------------------------------------------------
  // Retraits de commission (demande du 08/08/2026)
  // -------------------------------------------------------------------------

  @Get('withdrawals/balance')
  @ApiOperation({ summary: 'Mon solde retirable' })
  balance(@CurrentUser() user: { id: string }) {
    return this.withdrawals.balance(user.id);
  }

  @Get('withdrawals')
  @ApiOperation({ summary: 'Historique des retraits' })
  listWithdrawals(
    @Query() filters: FilterWithdrawalDto,
    @CurrentUser() user: { id: string; role?: { name: string } },
  ) {
    // Un commercial ne voit que ses propres demandes ; les profils
    // d'autorisation voient tout, et peuvent filtrer par bénéficiaire.
    const scopeToUserId = user?.role?.name === 'COMMERCIAL' ? user.id : undefined;
    return this.withdrawals.findAll({ ...filters, scopeToUserId });
  }

  @Post('withdrawals')
  @ApiOperation({ summary: 'Demander un retrait sur ses commissions validées' })
  requestWithdrawal(
    @Body() dto: RequestWithdrawalDto,
    @CurrentUser() user: { id: string },
  ) {
    // Toujours pour soi-même : on ne demande pas un retrait au nom d'un tiers.
    return this.withdrawals.request(user.id, dto.amount, dto.reason);
  }

  @Patch('withdrawals/:id/approve')
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES')
  @ApiOperation({ summary: 'Autoriser un retrait' })
  approveWithdrawal(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.withdrawals.approve(id, user.id);
  }

  @Patch('withdrawals/:id/reject')
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES')
  @ApiOperation({ summary: 'Refuser un retrait, motif obligatoire' })
  rejectWithdrawal(
    @Param('id') id: string,
    @Body() dto: RejectWithdrawalDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.withdrawals.reject(id, user.id, dto.rejectionReason);
  }

  @Patch('withdrawals/:id/pay')
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'MANAGER')
  @ApiOperation({ summary: 'Marquer un retrait comme versé' })
  payWithdrawal(
    @Param('id') id: string,
    @Body() dto: PayWithdrawalDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.withdrawals.markPaid(id, user.id, dto);
  }

  @Patch('withdrawals/:id/cancel')
  @ApiOperation({ summary: 'Annuler sa propre demande, tant qu’elle est en attente' })
  cancelWithdrawal(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.withdrawals.cancel(id, user.id);
  }

  @Get('plans')
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'MANAGER')
  @ApiOperation({ summary: 'Barèmes de commissionnement' })
  plans() {
    return this.commissionsService.plans();
  }

  @Post('plans')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Créer un barème' })
  createPlan(@Body() dto: CreatePlanDto) {
    return this.commissionsService.createPlan(dto);
  }

  @Patch('plans/:id')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Modifier un barème' })
  updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.commissionsService.updatePlan(id, dto);
  }

  @Delete('plans/:id')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Désactiver ou supprimer un barème' })
  removePlan(@Param('id') id: string) {
    return this.commissionsService.removePlan(id);
  }

  @Get('summary')
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'MANAGER')
  @ApiOperation({ summary: 'Synthèse par commercial sur une période' })
  summary(@Query('period') period: string) {
    return this.commissionsService.summary(period);
  }

  @Post('compute')
  @Roles('SUPER_ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Calculer les commissions d’une période (idempotent)' })
  compute(@Body() dto: ComputeCommissionsDto, @CurrentUser() user: { id: string }) {
    return this.commissionsService.compute(dto, user.id);
  }

  @Post('approve')
  @Roles('SUPER_ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Valider les commissions en attente d’une période' })
  approve(
    @Body() body: { period: string; userId?: string },
    @CurrentUser() user: { id: string },
  ) {
    return this.commissionsService.approve(body.period, user.id, body.userId);
  }

  @Post('pay')
  @Roles('SUPER_ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Marquer les commissions validées comme payées' })
  pay(@Body() body: { period: string; userId?: string }, @CurrentUser() user: { id: string }) {
    return this.commissionsService.markPaid(body.period, user.id, body.userId);
  }

  @Patch(':id/cancel')
  @Roles('SUPER_ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Annuler une commission non payée' })
  cancel(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: { id: string },
  ) {
    return this.commissionsService.cancel(id, body.reason, user.id);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'MANAGER')
  @ApiOperation({ summary: 'Lignes de commission, filtrables' })
  findAll(
    @Query('period') period?: string,
    @Query('userId') userId?: string,
    @Query('status') status?: CommissionStatus,
  ) {
    return this.commissionsService.findAll({ period, userId, status });
  }
}
