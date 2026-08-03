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

import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';

/**
 * Administration des clés d'API partenaires (CDC §5 — V2).
 *
 * Réservé au Super administrateur : une clé donne accès aux envois et au
 * solde d'un client, elle engage l'entreprise autant qu'un contrat.
 */
@ApiTags('Clés API')
@ApiBearerAuth()
@Controller('api-keys')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Get()
  @ApiOperation({ summary: 'Clés émises, filtrables par client' })
  findAll(@Query('customerId') customerId?: string) {
    return this.apiKeysService.findAll(customerId);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Volumétrie et taux d’erreur d’une clé' })
  stats(@Param('id') id: string, @Query('days') days?: string) {
    return this.apiKeysService.stats(id, days ? Number(days) : 7);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d’une clé (jamais le secret)' })
  findOne(@Param('id') id: string) {
    return this.apiKeysService.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Émettre une clé — la valeur complète n’est renvoyée qu’à cet instant',
  })
  create(@Body() dto: CreateApiKeyDto, @CurrentUser() user: { id: string }) {
    return this.apiKeysService.create(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier le nom, les portées ou les plafonds' })
  update(@Param('id') id: string, @Body() dto: UpdateApiKeyDto) {
    return this.apiKeysService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Révoquer une clé (la ligne est conservée)' })
  revoke(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.apiKeysService.revoke(id, user.id);
  }
}
