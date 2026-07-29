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

import { ObjectivesService } from './objectives.service';

import { CreateObjectiveDto } from './dto/create-objective.dto';
import { UpdateObjectiveDto } from './dto/update-objective.dto';

/** Objectifs commerciaux par utilisateur et par période (CDC §4.1, §9).
 * Assignation réservée à l'encadrement ; consultation ouverte à tous
 * (un commercial doit pouvoir suivre son propre objectif). */
@ApiTags('Objectives')
@ApiBearerAuth()
@Controller('objectives')
@UseGuards(JwtAuthGuard)
export class ObjectivesController {
  constructor(private readonly objectivesService: ObjectivesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR')
  @ApiOperation({ summary: 'Assigner un objectif commercial' })
  create(
    @Body() dto: CreateObjectiveDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.objectivesService.create(dto, user.id);
  }

  @Get()
  findAll(
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.objectivesService.findAll({ userId, from, to });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.objectivesService.findOne(id);
  }

  @Get(':id/progress')
  @ApiOperation({ summary: 'Avancement réel vs objectif' })
  progress(@Param('id') id: string) {
    return this.objectivesService.progress(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR')
  update(@Param('id') id: string, @Body() dto: UpdateObjectiveDto) {
    return this.objectivesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES')
  remove(@Param('id') id: string) {
    return this.objectivesService.remove(id);
  }
}
