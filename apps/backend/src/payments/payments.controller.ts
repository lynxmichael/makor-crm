import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { PaymentsService } from './payments.service';

import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({
    summary: 'Créer un paiement',
  })
  create(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Liste des paiements',
  })
  findAll() {
    return this.paymentsService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Détails d’un paiement',
  })
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Modifier un paiement',
  })
  update(@Param('id') id: string, @Body() dto: UpdatePaymentDto) {
    return this.paymentsService.update(id, dto);
  }

  @Patch(':id/validate')
  @ApiOperation({
    summary: 'Valider un paiement',
  })
  validate(@Param('id') id: string) {
    return this.paymentsService.validatePayment(id);
  }

  @Patch(':id/refund')
  @ApiOperation({
    summary: 'Rembourser un paiement',
  })
  refund(@Param('id') id: string) {
    return this.paymentsService.refund(id);
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Annuler un paiement',
  })
  cancel(@Param('id') id: string) {
    return this.paymentsService.cancel(id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Supprimer un paiement',
  })
  remove(@Param('id') id: string) {
    return this.paymentsService.remove(id);
  }
}
