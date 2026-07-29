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
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { QuotesService } from './quotes.service';

import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';

@ApiTags('Quotes')
@ApiBearerAuth()
@Controller('quotes')
@UseGuards(JwtAuthGuard)
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post()
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
  ) {
    return this.quotesService.findAll({
      page: Number(page),
      limit: Number(limit),
      search,
      status,
      customerId,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détails d’un devis' })
  findOne(@Param('id') id: string) {
    return this.quotesService.findOne(id);
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
  @ApiOperation({ summary: 'Modifier un devis' })
  update(@Param('id') id: string, @Body() dto: UpdateQuoteDto) {
    return this.quotesService.update(id, dto);
  }

  @Post(':id/send')
  @ApiOperation({ summary: 'Envoyer le devis par email au client (PDF joint)' })
  send(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.quotesService.send(id, user?.id);
  }

  @Patch(':id/accept')
  @ApiOperation({ summary: 'Marquer le devis comme accepté par le client' })
  accept(@Param('id') id: string) {
    return this.quotesService.accept(id);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Marquer le devis comme refusé par le client' })
  reject(@Param('id') id: string) {
    return this.quotesService.reject(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un devis' })
  remove(@Param('id') id: string) {
    return this.quotesService.remove(id);
  }
}
