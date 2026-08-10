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
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { DealsService } from './deals.service';

import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { MoveDealStageDto } from './dto/move-stage.dto';

@ApiTags('Deals')
@ApiBearerAuth()
@Controller('deals')
@UseGuards(JwtAuthGuard)
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Post()
  @ApiOperation({ summary: 'Créer une opportunité' })
  create(@Body() dto: CreateDealDto) {
    return this.dealsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Liste des opportunités' })
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @Query('stageId') stageId?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('customerId') customerId?: string,
    @Query('leadId') leadId?: string,
  ) {
    return this.dealsService.findAll({
      page: Number(page),
      limit: Number(limit),
      search,
      stageId,
      assignedToId,
      customerId,
      leadId,
    });
  }

  @Get('board')
  @ApiOperation({ summary: 'Vue pipeline (Kanban) — deals groupés par étape' })
  board() {
    return this.dealsService.board();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détails d’une opportunité' })
  findOne(@Param('id') id: string) {
    return this.dealsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier une opportunité' })
  update(@Param('id') id: string, @Body() dto: UpdateDealDto) {
    return this.dealsService.update(id, dto);
  }

  @Patch(':id/move-stage')
  @ApiOperation({
    summary: 'Déplacer une opportunité vers une autre étape du pipeline',
  })
  moveStage(
    @Param('id') id: string,
    @Body() dto: MoveDealStageDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.dealsService.moveStage(id, dto, user?.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une opportunité' })
  remove(@Param('id') id: string) {
    return this.dealsService.remove(id);
  }
}
