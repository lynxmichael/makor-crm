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

import { ContractsService } from './contracts.service';

import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';

@ApiTags('Contracts')
@ApiBearerAuth()
@Controller('contracts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post('from-quote/:quoteId')
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL')
  @ApiOperation({
    summary: 'Générer le contrat depuis une facture proforma acceptée',
  })
  createFromQuote(
    @Param('quoteId') quoteId: string,
    @CurrentUser() user: { id: string },
    @Body() body?: { title?: string },
  ) {
    return this.contractsService.createFromQuote(quoteId, user.id, body?.title);
  }

  @Post('from-purchase-order/:purchaseOrderId')
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL')
  @ApiOperation({
    summary: 'Générer le contrat à partir d’un bon de commande signé (CDC §4.9)',
  })
  createFromPurchaseOrder(
    @Param('purchaseOrderId') purchaseOrderId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.contractsService.createFromPurchaseOrder(
      purchaseOrderId,
      user.id,
    );
  }

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL')
  @ApiOperation({ summary: 'Créer un contrat manuellement' })
  create(@Body() dto: CreateContractDto, @CurrentUser() user: { id: string }) {
    return this.contractsService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Liste des contrats' })
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @CurrentUser() user?: any,
  ) {
    return this.contractsService.findAll({
      page: Number(page),
      limit: Number(limit),
      search,
      status,
      customerId,
      scopeToUserId: user?.role?.name === 'COMMERCIAL' ? user.id : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contractsService.findOne(id);
  }

  @Get(':id/pdf')
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    const { pdf, number } = await this.contractsService.getPdf(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${number}.pdf"`,
    });

    res.send(pdf);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL')
  update(@Param('id') id: string, @Body() dto: UpdateContractDto) {
    return this.contractsService.update(id, dto);
  }

  @Post(':id/send')
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL')
  @ApiOperation({ summary: 'Transmettre le contrat au client par email' })
  send(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.contractsService.send(id, user?.id);
  }

  @Patch(':id/mark-signed')
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL')
  @ApiOperation({ summary: 'Marquer le contrat comme signé par le client' })
  markSigned(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.contractsService.markSigned(id, user?.id);
  }

  @Patch(':id/suspend')
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL')
  suspend(@Param('id') id: string) {
    return this.contractsService.suspend(id);
  }

  @Patch(':id/terminate')
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL')
  terminate(@Param('id') id: string) {
    return this.contractsService.terminate(id);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL')
  remove(@Param('id') id: string) {
    return this.contractsService.remove(id);
  }
}
