import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CustomersService } from './customers.service';

import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { FilterCustomerDto } from './dto/filter-customer.dto';

import { Roles } from '../auth/decorators/roles.decorator';

/**
 * `JwtAuthGuard` n'est plus déclaré ici : il est global depuis l'étape 1 (D16),
 * et le redéclarer laissait croire que l'authentification tenait au contrôleur.
 *
 * Les rôles suivent la matrice §7 du CDC sur le domaine « Clients, prospects et
 * opportunités » : Super Admin **total**, Commercial **écriture**, Admin ventes,
 * Superviseur et Finance **lecture seule**.
 *
 * D'où la ligne de partage entre l'écriture et la suppression : le Commercial
 * crée et modifie ses clients, il n'en efface pas — effacer relève du niveau
 * « total », que seul le Super Admin possède.
 */
@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'COMMERCIAL')
  create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  /** Lecture ouverte à toute session : les cinq rôles ont au moins « lecture ». */
  @Get()
  findAll(@Query() filter: FilterCustomerDto) {
    return this.customersService.findAll(filter);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'COMMERCIAL')
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(id, dto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  @ApiOperation({
    summary: 'Suppression définitive — réservée au Super Admin (§7 « total »)',
  })
  remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }
}
