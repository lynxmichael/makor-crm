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

import { ProductsService } from './products.service';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  CreateProductPricingDto,
  UpdateProductPricingDto,
} from './dto/product-pricing.dto';

/**
 * Catalogue produits MAKOR (CDC §4.5). Lecture ouverte à tout utilisateur
 * connecté (nécessaire pour composer devis/BC), écriture réservée au
 * Super Admin et à l'Admin ventes.
 */
@ApiTags('Products')
@ApiBearerAuth()
@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES')
  @ApiOperation({ summary: 'Créer un produit du catalogue' })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Liste du catalogue produits' })
  findAll(@Query('activeOnly') activeOnly?: string) {
    return this.productsService.findAll(activeOnly === 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch('pricing/:pricingId')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES')
  updatePricing(
    @Param('pricingId') pricingId: string,
    @Body() dto: UpdateProductPricingDto,
  ) {
    return this.productsService.updatePricing(pricingId, dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete('pricing/:pricingId')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  removePricing(@Param('pricingId') pricingId: string) {
    return this.productsService.removePricing(pricingId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  @Post(':id/pricing')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES')
  @ApiOperation({
    summary: 'Définir le tarif et la marge pour un pays / secteur',
  })
  addPricing(
    @Param('id') id: string,
    @Body() dto: CreateProductPricingDto,
  ) {
    return this.productsService.addPricing(id, dto);
  }

  
  }
