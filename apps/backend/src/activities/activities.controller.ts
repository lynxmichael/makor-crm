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

import { ActivitiesService } from './activities.service';

import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@ApiTags('Activities')
@ApiBearerAuth()
@Controller('activities')
@UseGuards(JwtAuthGuard)
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post()
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
      assignedToId,
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
  @ApiOperation({
    summary: 'Modifier une activité',
  })
  update(@Param('id') id: string, @Body() dto: UpdateActivityDto) {
    return this.activitiesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Supprimer une activité',
  })
  remove(@Param('id') id: string) {
    return this.activitiesService.remove(id);
  }
}
