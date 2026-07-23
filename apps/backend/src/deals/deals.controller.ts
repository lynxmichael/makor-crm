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

import { DealsService } from './deals.service';

import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';

@ApiTags('Deals')
@ApiBearerAuth()
@Controller('deals')
@UseGuards(JwtAuthGuard)
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Post()
  @ApiOperation({
    summary: 'Créer une opportunité',
  })
  create(@Body() dto: CreateDealDto) {
    return this.dealsService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Liste des opportunités',
  })
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @Query('stage') stage?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('customerId') customerId?: string,
    @Query('leadId') leadId?: string,
  ) {
    return this.dealsService.findAll({
      page: Number(page),
      limit: Number(limit),
      search,
      stage,
      assignedToId,
      customerId,
      leadId,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Détails d’une opportunité',
  })
  findOne(@Param('id') id: string) {
    return this.dealsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Modifier une opportunité',
  })
  update(@Param('id') id: string, @Body() dto: UpdateDealDto) {
    return this.dealsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Supprimer une opportunité',
  })
  remove(@Param('id') id: string) {
    return this.dealsService.remove(id);
  }
}
