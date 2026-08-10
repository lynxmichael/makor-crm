import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCompanyDto) {
    return this.prisma.company.create({
      data: {
        code: dto.code,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
      },

      include: {
        users: true,
        customers: true,
      },
    });
  }

  async findAll() {
    return this.prisma.company.findMany({
      include: {
        users: true,
        customers: true,
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({
      where: {
        id,
      },

      include: {
        users: true,
        customers: true,
      },
    });

    if (!company) {
      throw new NotFoundException('Entreprise introuvable');
    }

    return company;
  }

  async update(id: string, dto: UpdateCompanyDto) {
    await this.findOne(id);

    return this.prisma.company.update({
      where: {
        id,
      },

      data: {
        ...dto,
      },

      include: {
        users: true,
        customers: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.company.delete({
      where: {
        id,
      },
    });
  }
}
