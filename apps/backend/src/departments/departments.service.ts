import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateDepartmentDto) {
    return this.prisma.department.create({
      data: dto,
    });
  }

  findAll() {
    return this.prisma.department.findMany({
      include: {
        users: true,
      },

      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const department = await this.prisma.department.findUnique({
        where: {
          id,
        },

        include: {
          users: true,
        },
      });

    if (!department) {
      throw new NotFoundException('Département introuvable');
    }

    return department;
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    await this.findOne(id);

    return this.prisma.department.update({
      where: {
        id,
      },

      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.department.delete({
      where: {
        id,
      },
    });
  }
}
