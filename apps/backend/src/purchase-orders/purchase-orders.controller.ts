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

import { PurchaseOrdersService } from './purchase-orders.service';

import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { FromQuoteDto } from './dto/from-quote.dto';
import { SignPurchaseOrderDto } from './dto/sign-purchase-order.dto';

@ApiTags('Purchase Orders')
@ApiBearerAuth()
@Controller('purchase-orders')
@UseGuards(JwtAuthGuard)
export class PurchaseOrdersController {
  constructor(
    private readonly purchaseOrdersService: PurchaseOrdersService,
  ) {}

  @Post('from-quote/:quoteId')
  @ApiOperation({
    summary: 'Transformer un devis accepté en bon de commande (CDC §4.8)',
  })
  createFromQuote(
    @Param('quoteId') quoteId: string,
    @Body() dto: FromQuoteDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.purchaseOrdersService.createFromQuote(quoteId, dto, user?.id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un bon de commande autonome' })
  create(
    @Body() dto: CreatePurchaseOrderDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.purchaseOrdersService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Liste des bons de commande' })
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.purchaseOrdersService.findAll({
      page: Number(page),
      limit: Number(limit),
      search,
      status,
      customerId,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.purchaseOrdersService.findOne(id);
  }

  @Get(':id/pdf')
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    const { pdf, number } = await this.purchaseOrdersService.getPdf(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${number}.pdf"`,
    });

    res.send(pdf);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePurchaseOrderDto) {
    return this.purchaseOrdersService.update(id, dto);
  }

  @Post(':id/send')
  @ApiOperation({ summary: 'Envoyer le bon de commande par email au client' })
  send(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.purchaseOrdersService.send(id, user?.id);
  }

  @Patch(':id/sign')
  @ApiOperation({ summary: 'Marquer le bon de commande comme signé' })
  sign(
    @Param('id') id: string,
    @Body() dto: SignPurchaseOrderDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.purchaseOrdersService.sign(id, dto, user?.id);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.purchaseOrdersService.cancel(id, user?.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.purchaseOrdersService.remove(id);
  }
}
