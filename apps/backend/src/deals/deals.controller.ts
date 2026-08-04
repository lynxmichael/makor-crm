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

import { DealsService } from './deals.service';

import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { MoveDealStageDto } from './dto/move-stage.dto';

@ApiTags('Deals')
@ApiBearerAuth()
@Controller('deals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL')
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
    @CurrentUser() user?: any,
  ) {
    return this.dealsService.findAll({
      page: Number(page),
      limit: Number(limit),
      search,
      stageId,
      // Un commercial ne voit que ses opportunités. Le filtre est imposé,
      // pas proposé : passer `assignedToId` en query ne permet pas de
      // regarder le portefeuille d'un collègue.
      assignedToId: user?.role?.name === 'COMMERCIAL' ? user.id : assignedToId,
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
  findOne(@Param('id') id: string, @CurrentUser() user?: any) {
    return this.dealsService.findOne(id, user?.role?.name === 'COMMERCIAL' ? user.id : undefined);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL')
  @ApiOperation({ summary: 'Modifier une opportunité' })
  update(@Param('id') id: string, @Body() dto: UpdateDealDto, @CurrentUser() user?: any) {
    return this.dealsService.update(id, dto, user?.role?.name === 'COMMERCIAL' ? user.id : undefined);
  }

  @Patch(':id/move-stage')
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL')
  @ApiOperation({ summary: 'Déplacer une opportunité vers une autre étape du pipeline' })
  moveStage(
    @Param('id') id: string,
    @Body() dto: MoveDealStageDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.dealsService.moveStage(id, dto, user?.id);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL')
  @ApiOperation({ summary: 'Supprimer une opportunité' })
  remove(@Param('id') id: string, @CurrentUser() user?: any) {
    return this.dealsService.remove(id, user?.role?.name === 'COMMERCIAL' ? user.id : undefined);
  }
}
