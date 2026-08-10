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

import { RechargesService } from './recharges.service';

import { CreateRechargeDto } from './dto/create-recharge.dto';
import { UpdateRechargeDto } from './dto/update-recharge.dto';

@ApiTags('Recharges')
@ApiBearerAuth()
@Controller('recharges')
@UseGuards(JwtAuthGuard)
export class RechargesController {
  constructor(private readonly rechargesService: RechargesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'FINANCE')
  @ApiOperation({ summary: 'Enregistrer un rechargement de crédit prépayé' })
  create(@Body() dto: CreateRechargeDto, @CurrentUser() user: { id: string }) {
    return this.rechargesService.create(dto, user?.id);
  }

  @Get()
  @ApiOperation({ summary: 'Historique des rechargements' })
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('customerId') customerId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.rechargesService.findAll({
      page: Number(page),
      limit: Number(limit),
      customerId,
      from,
      to,
    });
  }

  @Get('balance/:customerId')
  @ApiOperation({ summary: 'Solde prépayé courant d’un client' })
  balance(@Param('customerId') customerId: string) {
    return this.rechargesService.balance(customerId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rechargesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'FINANCE')
  update(@Param('id') id: string, @Body() dto: UpdateRechargeDto) {
    return this.rechargesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'FINANCE')
  remove(@Param('id') id: string) {
    return this.rechargesService.remove(id);
  }
}
