import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';

import type { Response } from 'express';

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { ReportingService } from './reporting.service';
import { ExportFormat } from './reporting.utils';

/**
 * Exports de reporting (CDC §4.15) — PDF / Excel / CSV, filtrables par
 * période, pays et secteur. Réservé à l'encadrement : ces exports
 * contiennent des données commerciales et financières consolidées.
 */
@ApiTags('Reporting')
@ApiBearerAuth()
@Controller('reporting')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'MANAGER')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  private send(res: Response, filename: string, file: { buffer: Buffer; contentType: string; extension: string }) {
    res.setHeader('Content-Type', file.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}.${file.extension}"`,
    );
    res.send(file.buffer);
  }

  @Get('customers')
  @ApiOperation({ summary: 'Export du portefeuille clients' })
  async customers(
    @Res() res: Response,
    @Query('format') format: ExportFormat = 'xlsx',
    @Query('country') country?: string,
    @Query('sector') sector?: string,
  ) {
    const file = await this.reportingService.customers(format, { country, sector });
    this.send(res, 'clients', file);
  }

  @Get('deals')
  @ApiOperation({ summary: 'Export du pipeline commercial' })
  async deals(
    @Res() res: Response,
    @Query('format') format: ExportFormat = 'xlsx',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const file = await this.reportingService.deals(format, { from, to });
    this.send(res, 'pipeline', file);
  }

  @Get('invoices')
  @ApiOperation({ summary: 'Export factures & encaissements' })
  async invoices(
    @Res() res: Response,
    @Query('format') format: ExportFormat = 'xlsx',
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('customerId') customerId?: string,
  ) {
    const file = await this.reportingService.invoices(format, { from, to, customerId });
    this.send(res, 'factures', file);
  }

  @Get('recharges')
  @ApiOperation({ summary: 'Export réchargements / soldes prépayés' })
  async recharges(
    @Res() res: Response,
    @Query('format') format: ExportFormat = 'xlsx',
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('customerId') customerId?: string,
  ) {
    const file = await this.reportingService.recharges(format, { from, to, customerId });
    this.send(res, 'rechargements', file);
  }

  @Get('campaigns/:id/recipients')
  @ApiOperation({ summary: 'Export délivrabilité / rejets d’une campagne' })
  async campaignRecipients(
    @Res() res: Response,
    @Param('id') id: string,
    @Query('format') format: ExportFormat = 'xlsx',
  ) {
    const file = await this.reportingService.campaignRecipients(id, format);
    this.send(res, `campagne-${id}`, file);
  }

  @Get('sales-performance')
  @ApiOperation({ summary: 'Export performance commerciale (panier moyen, transformation)' })
  async salesPerformance(
    @Res() res: Response,
    @Query('format') format: ExportFormat = 'xlsx',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const file = await this.reportingService.salesPerformance(format, { from, to });
    this.send(res, 'performance-commerciale', file);
  }
}
