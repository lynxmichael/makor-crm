import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { WarehousesService } from './warehouses.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { Query } from '@nestjs/common';
import { QueryWarehouseDto } from './dto/query-warehouse.dto';

@ApiTags('Warehouses')
@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Post()
  @ApiOperation({
    summary: 'Créer un entrepôt',
  })
  @ApiResponse({
    status: 201,
    description: 'Entrepôt créé avec succès.',
  })
  create(@Body() dto: CreateWarehouseDto) {
    return this.warehousesService.create(dto);
  }

@Get()
 findAll(@Query() query: QueryWarehouseDto) {
  return this.warehousesService.findAll(query);
}

  @Get(':id')
  @ApiOperation({
    summary: 'Détail d’un entrepôt',
  })
  findOne(@Param('id') id: string) {
    return this.warehousesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Modifier un entrepôt',
  })
  update(@Param('id') id: string, @Body() dto: UpdateWarehouseDto) {
    return this.warehousesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Désactiver un entrepôt',
  })
  remove(@Param('id') id: string) {
    return this.warehousesService.remove(id);
  }
  @Get('dashboard')
dashboard() {
  return this.warehousesService.dashboard();
}
@Patch(':id/restore')
restore(
  @Param('id') id: string,
) {
  return this.warehousesService.restore(id);
}
@Get('code/:code')
findByCode(
  @Param('code') code: string,
) {
  return this.warehousesService.findByCode(code);
}

}
