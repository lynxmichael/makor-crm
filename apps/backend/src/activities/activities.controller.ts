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

import { ActivitiesService } from './activities.service';

import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@ApiTags('Activities')
@ApiBearerAuth()
@Controller('activities')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL')
  @ApiOperation({
    summary: 'Créer une activité',
  })
  create(@Body() dto: CreateActivityDto) {
    return this.activitiesService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Liste des activités',
  })
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('assignedToId') assignedToId?: string,
    @CurrentUser() user?: any,
    @Query('leadId') leadId?: string,
    @Query('customerId') customerId?: string,
    @Query('dealId') dealId?: string,
  ) {
    return this.activitiesService.findAll({
      page: Number(page),
      limit: Number(limit),
      search,
      type,
      status,
      // Un commercial ne voit que son propre agenda : le filtre est

      // imposé, pas proposé.

      assignedToId: user?.role?.name === 'COMMERCIAL' ? user.id : assignedToId,
      leadId,
      customerId,
      dealId,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Détails d’une activité',
  })
  findOne(@Param('id') id: string) {
    return this.activitiesService.findOne(id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL')
  @ApiOperation({
    summary: 'Modifier une activité',
  })
  update(@Param('id') id: string, @Body() dto: UpdateActivityDto) {
    return this.activitiesService.update(id, dto);
  }

  @Post(':id/send-report')
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL')
  @ApiOperation({
    summary: 'Envoyer le compte rendu du rendez-vous par email au client',
  })
  sendReport(@Param('id') id: string) {
    return this.activitiesService.sendReport(id);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL')
  @ApiOperation({
    summary: 'Supprimer une activité',
  })
  remove(@Param('id') id: string) {
    return this.activitiesService.remove(id);
  }
}
