import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateRoleDto) {
    return this.prisma.role.create({
      data: dto,
    });
  }

  findAll() {
    return this.prisma.role.findMany({
      include: {
        users: true,
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        users: true,
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Rôle introuvable');
    }

    return role;
  }

  async update(id: string, dto: UpdateRoleDto) {
    await this.findOne(id);

    return this.prisma.role.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.role.delete({
      where: { id },
    });
  }
}
