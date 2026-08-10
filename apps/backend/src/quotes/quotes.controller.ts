import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';

import type { Response } from 'express';

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { QuotesService } from './quotes.service';

import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';

@ApiTags('Quotes')
@ApiBearerAuth()
@Controller('quotes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL')
  @ApiOperation({ summary: 'Créer un devis' })
  create(@Body() dto: CreateQuoteDto) {
    return this.quotesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Liste des devis' })
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @CurrentUser() user?: any,
  ) {
    return this.quotesService.findAll({
      page: Number(page),
      limit: Number(limit),
      search,
      status,
      customerId,
      scopeToUserId: user?.role?.name === 'COMMERCIAL' ? user.id : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détails d’un devis' })
  findOne(@Param('id') id: string, @CurrentUser() user?: any) {
    return this.quotesService.findOne(id, user?.role?.name === 'COMMERCIAL' ? user.id : undefined);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Télécharger le devis au format PDF' })
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    const { pdf, number } = await this.quotesService.getPdf(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${number}.pdf"`,
    });

    res.send(pdf);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL')
  @ApiOperation({ summary: 'Modifier un devis' })
  update(@Param('id') id: string, @Body() dto: UpdateQuoteDto, @CurrentUser() user?: any) {
    return this.quotesService.update(id, dto, user?.role?.name === 'COMMERCIAL' ? user.id : undefined);
  }

  @Post(':id/send')
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL')
  @ApiOperation({ summary: 'Envoyer le devis par email au client (PDF joint)' })
  send(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.quotesService.send(id, user?.id);
  }

  @Patch(':id/accept')
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL')
  @ApiOperation({ summary: 'Marquer le devis comme accepté par le client' })
  accept(@Param('id') id: string) {
    return this.quotesService.accept(id);
  }

  @Patch(':id/reject')
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL')
  @ApiOperation({ summary: 'Marquer le devis comme refusé par le client' })
  reject(@Param('id') id: string) {
    return this.quotesService.reject(id);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL')
  @ApiOperation({ summary: 'Supprimer un devis' })
  remove(@Param('id') id: string, @CurrentUser() user?: any) {
    return this.quotesService.remove(id, user?.role?.name === 'COMMERCIAL' ? user.id : undefined);
  }
}
