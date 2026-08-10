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

import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { LeadsService } from './leads.service';

import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

@ApiTags('Leads')
@ApiBearerAuth()
@Controller('leads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL')
  @ApiOperation({ summary: 'Créer un prospect' })
  create(@Body() dto: CreateLeadDto) {
    return this.leadsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Liste des prospects' })
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('source') source?: string,
    @Query('assignedToId') assignedToId?: string,
    @CurrentUser() user?: any,
  ) {
    return this.leadsService.findAll({
      page: Number(page),
      limit: Number(limit),
      search,
      status,
      source,
      // Un commercial ne voit que ses prospects.
      assignedToId: user?.role?.name === 'COMMERCIAL' ? user.id : assignedToId,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détails d’un prospect' })
  findOne(@Param('id') id: string, @CurrentUser() user?: any) {
    return this.leadsService.findOne(id, user?.role?.name === 'COMMERCIAL' ? user.id : undefined);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL')
  @ApiOperation({ summary: 'Modifier un prospect' })
  update(@Param('id') id: string, @Body() dto: UpdateLeadDto, @CurrentUser() user?: any) {
    return this.leadsService.update(id, dto, user?.role?.name === 'COMMERCIAL' ? user.id : undefined);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL')
  @ApiOperation({ summary: 'Supprimer un prospect' })
  remove(@Param('id') id: string, @CurrentUser() user?: any) {
    return this.leadsService.remove(id, user?.role?.name === 'COMMERCIAL' ? user.id : undefined);
  }
}
