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

import { ContractsService } from './contracts.service';

import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';

@ApiTags('Contracts')
@ApiBearerAuth()
@Controller('contracts')
@UseGuards(JwtAuthGuard)
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  @ApiOperation({
    summary: 'Créer un contrat',
  })
  create(@Body() dto: CreateContractDto) {
    return this.contractsService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Liste des contrats',
  })
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.contractsService.findAll({
      page: Number(page),
      limit: Number(limit),
      search,
      status,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Détails d’un contrat',
  })
  findOne(@Param('id') id: string) {
    return this.contractsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Modifier un contrat',
  })
  update(@Param('id') id: string, @Body() dto: UpdateContractDto) {
    return this.contractsService.update(id, dto);
  }

  @Patch(':id/activate')
  @ApiOperation({
    summary: 'Activer un contrat',
  })
  activate(@Param('id') id: string) {
    return this.contractsService.activate(id);
  }

  @Patch(':id/suspend')
  @ApiOperation({
    summary: 'Suspendre un contrat',
  })
  suspend(@Param('id') id: string) {
    return this.contractsService.suspend(id);
  }

  @Patch(':id/terminate')
  @ApiOperation({
    summary: 'Résilier un contrat',
  })
  terminate(@Param('id') id: string) {
    return this.contractsService.terminate(id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Supprimer un contrat',
  })
  remove(@Param('id') id: string) {
    return this.contractsService.remove(id);
  }
}
