import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateRolePermissionDto } from './dto/create-role-permission.dto';
import { UpdateRolePermissionDto } from './dto/update-role-permission.dto';

@Injectable()
export class RolePermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateRolePermissionDto) {
    return this.prisma.rolePermission.create({
      data: {
        role: {
          connect: {
            id: dto.roleId,
          },
        },

        permission: {
          connect: {
            id: dto.permissionId,
          },
        },
      },

      include: {
        role: true,
        permission: true,
      },
    });
  }

  findAll() {
    return this.prisma.rolePermission.findMany({
      include: {
        role: true,
        permission: true,
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const rolePermission = await this.prisma.rolePermission.findUnique({
        where: {
          id,
        },

        include: {
          role: true,
          permission: true,
        },
      });

    if (!rolePermission) {
      throw new NotFoundException('Association introuvable');
    }

    return rolePermission;
  }

  async update(id: string, dto: UpdateRolePermissionDto) {
    await this.findOne(id);

    return this.prisma.rolePermission.update({
      where: {
        id,
      },

      data: {
        role: dto.roleId
          ? {
              connect: {
                id: dto.roleId,
              },
            }
          : undefined,

        permission: dto.permissionId
          ? {
              connect: {
                id: dto.permissionId,
              },
            }
          : undefined,
      },

      include: {
        role: true,
        permission: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.rolePermission.delete({
      where: {
        id,
      },
    });
  }
}
