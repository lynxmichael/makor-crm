import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { WorkflowsService } from './workflows.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';

/**
 * Moteur de workflow (CDC §5 — V2).
 *
 * Réservé au Super administrateur : une règle agit au nom du système, sur
 * des données qui ne lui appartiennent pas.
 */
@ApiTags('Automatisations')
@ApiBearerAuth()
@Controller('workflows')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class WorkflowsController {
  constructor(private readonly workflows: WorkflowsService) {}

  @Get()
  @ApiOperation({ summary: 'Règles d’automatisation' })
  findAll() {
    return this.workflows.findAll();
  }

  @Get(':id/runs')
  @ApiOperation({ summary: 'Journal d’exécution d’une règle' })
  runs(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.workflows.runs(id, limit ? Number(limit) : 50);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d’une règle' })
  findOne(@Param('id') id: string) {
    return this.workflows.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer une règle' })
  create(@Body() dto: CreateWorkflowDto, @CurrentUser() user: { id: string }) {
    return this.workflows.create(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier une règle' })
  update(@Param('id') id: string, @Body() dto: UpdateWorkflowDto) {
    return this.workflows.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une règle' })
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.workflows.remove(id, user.id);
  }
}
