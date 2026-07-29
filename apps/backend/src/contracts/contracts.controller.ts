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

import { ContractsService } from './contracts.service';

import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';

@ApiTags('Contracts')
@ApiBearerAuth()
@Controller('contracts')
@UseGuards(JwtAuthGuard)
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post('from-purchase-order/:purchaseOrderId')
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
  ) {
    return this.contractsService.findAll({
      page: Number(page),
      limit: Number(limit),
      search,
      status,
      customerId,
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
  update(@Param('id') id: string, @Body() dto: UpdateContractDto) {
    return this.contractsService.update(id, dto);
  }

  @Post(':id/send')
  @ApiOperation({ summary: 'Transmettre le contrat au client par email' })
  send(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.contractsService.send(id, user?.id);
  }

  @Patch(':id/mark-signed')
  @ApiOperation({ summary: 'Marquer le contrat comme signé par le client' })
  markSigned(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.contractsService.markSigned(id, user?.id);
  }

  @Patch(':id/suspend')
  suspend(@Param('id') id: string) {
    return this.contractsService.suspend(id);
  }

  @Patch(':id/terminate')
  terminate(@Param('id') id: string) {
    return this.contractsService.terminate(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.contractsService.remove(id);
  }
}
