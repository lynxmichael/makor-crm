import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { ExpensesService, type Actor } from './expenses.service';
import {
  CreateExpenseDto,
  FilterExpenseDto,
  ReimburseExpenseDto,
  RejectExpenseDto,
  UpdateExpenseDto,
} from './dto/expense.dto';

/**
 * Notes de frais (demande du 13/08/2026).
 *
 * Le dépôt est ouvert aux profils commerciaux — ce sont eux qui engagent les
 * dépenses. La consultation de l'ensemble, la validation et le remboursement
 * sont réservés au Super Admin et à l'Admin ventes ; le service filtre en plus
 * chaque lecture sur l'auteur, si bien qu'un commercial ne voit jamais que ses
 * propres notes même en appelant l'API directement.
 *
 * Le superviseur en est volontairement exclu : il encadre l'activité
 * commerciale, pas les remboursements.
 */
@ApiTags('Notes de frais')
@ApiBearerAuth()
@Controller('expenses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'COMMERCIAL')
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Get()
  @ApiOperation({ summary: 'Notes de frais du périmètre, avec totaux et répartition' })
  findAll(@Query() filters: FilterExpenseDto, @CurrentUser() user: Actor) {
    return this.expenses.findAll(user, {
      status: filters.status,
      category: filters.category,
      userId: filters.userId,
      from: filters.from ? new Date(filters.from) : undefined,
      to: filters.to ? new Date(filters.to) : undefined,
      search: filters.search,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Déposer une note de frais' })
  create(@Body() dto: CreateExpenseDto, @CurrentUser() user: Actor) {
    return this.expenses.create(user, { ...dto, spentAt: new Date(dto.spentAt) });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier sa note, tant qu’elle est en attente' })
  update(@Param('id') id: string, @Body() dto: UpdateExpenseDto, @CurrentUser() user: Actor) {
    // `spentAt` est extrait plutôt que surchargé après l'étalement : un
    // `...dto` suivi d'une réécriture laisse le type d'origine (une chaîne)
    // dans l'union déduite, et le service attend une Date.
    const { spentAt, ...rest } = dto;

    return this.expenses.update(id, user, {
      ...rest,
      ...(spentAt ? { spentAt: new Date(spentAt) } : {}),
    });
  }

  @Patch(':id/approve')
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES')
  @ApiOperation({ summary: 'Valider une note de frais' })
  approve(@Param('id') id: string, @CurrentUser() user: Actor) {
    return this.expenses.approve(id, user);
  }

  @Patch(':id/reject')
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES')
  @ApiOperation({ summary: 'Refuser une note, motif obligatoire' })
  reject(@Param('id') id: string, @Body() dto: RejectExpenseDto, @CurrentUser() user: Actor) {
    return this.expenses.reject(id, user, dto.rejectionReason);
  }

  @Patch(':id/reimburse')
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'MANAGER')
  @ApiOperation({ summary: 'Marquer une note validée comme remboursée' })
  reimburse(
    @Param('id') id: string,
    @Body() dto: ReimburseExpenseDto,
    @CurrentUser() user: Actor,
  ) {
    return this.expenses.reimburse(id, user, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une note non traitée' })
  remove(@Param('id') id: string, @CurrentUser() user: Actor) {
    return this.expenses.remove(id, user);
  }
}
