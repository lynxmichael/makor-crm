import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  CreateProductPricingDto,
  UpdateProductPricingDto,
} from './dto/product-pricing.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    const existing = await this.prisma.product.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(
        `Un produit avec le code "${dto.code}" existe déjà.`,
      );
    }

    return this.prisma.product.create({
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        price: dto.price,
        isActive: dto.isActive ?? true,
      },
    });
  }

  findAll(activeOnly = false) {
    return this.prisma.product.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      include: { pricingGrid: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { pricingGrid: true },
    });

    if (!product) {
      throw new NotFoundException('Produit introuvable');
    }

    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);

    return this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        price: dto.price,
        isActive: dto.isActive,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.product.delete({ where: { id } });
  }

  // --- Grille tarifaire (pays / secteur) — CDC §4.5 ---

  async addPricing(productId: string, dto: CreateProductPricingDto) {
    await this.findOne(productId);

    const existing = await this.prisma.productPricing.findFirst({
      where: {
        productId,
        country: dto.country,
        sector: dto.sector,
      },
    });

    if (existing) {
      return this.prisma.productPricing.update({
        where: {
          id: existing.id,
        },
        data: {
          unitPrice: dto.unitPrice,
          unitCost: dto.unitCost,
        },
      });
    }

    return this.prisma.productPricing.create({
      data: {
        productId,
        country: dto.country,
        sector: dto.sector,
        unitPrice: dto.unitPrice,
        unitCost: dto.unitCost,
      },
    });
  }

  async updatePricing(pricingId: string, dto: UpdateProductPricingDto) {
    const pricing = await this.prisma.productPricing.findUnique({
      where: { id: pricingId },
    });

    if (!pricing) {
      throw new NotFoundException('Grille tarifaire introuvable');
    }

    return this.prisma.productPricing.update({
      where: { id: pricingId },
      data: {
        unitPrice: dto.unitPrice,
        unitCost: dto.unitCost,
      },
    });
  }

  async removePricing(pricingId: string) {
    const pricing = await this.prisma.productPricing.findUnique({
      where: { id: pricingId },
    });

    if (!pricing) {
      throw new NotFoundException('Grille tarifaire introuvable');
    }

    return this.prisma.productPricing.delete({ where: { id: pricingId } });
  }
}
