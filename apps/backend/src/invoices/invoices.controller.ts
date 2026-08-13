import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
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

import { InvoicesService } from './invoices.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { InstallmentsService } from './installments.service';
import { GenerateInstallmentsDto } from './dto/generate-installments.dto';

import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

@ApiTags('Invoices')
@ApiBearerAuth()
@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'MANAGER')
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly invoicePdfService: InvoicePdfService,
    private readonly installments: InstallmentsService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Créer une facture',
  })
  create(@Body() dto: CreateInvoiceDto) {
    return this.invoicesService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Liste des factures',
  })
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.invoicesService.findAll({
      page: Number(page),
      limit: Number(limit),
      search,
      status,
      customerId,
    });
  }

  @Get(':id/schedule')
  @ApiOperation({ summary: 'Échéancier de la facture, versements imputés' })
  schedule(@Param('id') id: string) {
    return this.installments.schedule(id);
  }

  @Post(':id/schedule')
  @ApiOperation({ summary: 'Créer ou remplacer l’échéancier' })
  generateSchedule(
    @Param('id') id: string,
    @Body() dto: GenerateInstallmentsDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.installments.generate(
      id,
      {
        count: dto.count,
        everyDays: dto.everyDays,
        firstDueDate: dto.firstDueDate ? new Date(dto.firstDueDate) : undefined,
        downPayment: dto.downPayment,
      },
      user.id,
    );
  }

  @Delete(':id/schedule')
  @ApiOperation({ summary: 'Supprimer l’échéancier sans toucher aux versements' })
  clearSchedule(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.installments.clear(id, user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Détails d’une facture',
  })
  findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(id);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Télécharger la facture au format PDF' })
  @Header('Content-Type', 'application/pdf')
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    const invoice = await this.invoicesService.findOne(id);
    const buffer = await this.invoicePdfService.generate(id);

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${invoice.number}.pdf"`,
    );

    res.send(buffer);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Modifier une facture',
  })
  update(@Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    return this.invoicesService.update(id, dto);
  }

  @Post(':id/send')
  @ApiOperation({ summary: 'Envoyer la facture au client par e-mail, PDF joint' })
  send(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.invoicesService.send(id, user.id);
  }

  @Patch(':id/pay')
  @ApiOperation({
    summary: 'Marquer comme payée',
  })
  markAsPaid(@Param('id') id: string) {
    return this.invoicesService.markAsPaid(id);
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Annuler une facture',
  })
  cancel(@Param('id') id: string) {
    return this.invoicesService.cancel(id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Supprimer une facture',
  })
  remove(@Param('id') id: string) {
    return this.invoicesService.remove(id);
  }
}
