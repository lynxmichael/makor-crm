import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { FilterCustomerDto } from './dto/filter-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCustomerDto) {
    const { assignedToId, ...data } = dto;

    // Génération automatique du code s'il n'est pas fourni (requis par le modèle Prisma)
    const code = data.code ?? `CUST-${Date.now()}`;

    return this.prisma.customer.create({
      data: {
        ...data,
        code,
        // connexion à l'utilisateur assigné si présent
        ...(assignedToId && {
          assignedTo: {
            connect: { id: assignedToId },
          },
        }),
      },
    });
  }

  async findAll(filter: FilterCustomerDto) {
    const { page = 1, limit = 10, search, country, status } = filter;

    const where: any = {};

    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (country) {
      where.country = country;
    }

    if (status) {
      where.status = status;
    }

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        include: { assignedTo: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data: customers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: { assignedTo: true },
    });

    if (!customer) {
      throw new NotFoundException('Client introuvable');
    }

    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.findOne(id);

    return this.prisma.customer.update({
      where: { id },
      data: dto,
      include: { assignedTo: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.customer.delete({
      where: { id },
    });
  }
}
