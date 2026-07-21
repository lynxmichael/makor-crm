import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { Prisma, User } from '@prisma/client';

import * as argon2 from 'argon2';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

async create(dto: CreateUserDto): Promise<User> {

  const password = await argon2.hash(dto.password);

  return this.prisma.user.create({
    data: {
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      password,

      avatar: dto.avatar,
      jobTitle: dto.jobTitle,

      isActive: dto.isActive ?? true,

      role: {
        connect: {
          id: dto.roleId,
        },
      },

      ...(dto.departmentId && {
        department: {
          connect: {
            id: dto.departmentId,
          },
        },
      }),
    },
  });
}
  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    role?: string;
    department?: string;
  }) {
    const {
      page,
      limit,
      search,
      role,
      department,
    } = params;

    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      AND: [
        search
          ? {
              OR: [
                {
                  firstName: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  lastName: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  email: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {},

        role
          ? {
              role: {
                name: role,
              },
            }
          : {},

        department
          ? {
              department: {
                name: department,
              },
            }
          : {},
      ],
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          role: true,
          department: true,
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),

      this.prisma.user.count({
        where,
      }),
    ]);

    return {
      data: users,

      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: {
        email,
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        department: true,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: {
        id,
      },
      include: {
        role: true,
        department: true,
      },
    });
  }

  async update(
    id: string,
    data: Prisma.UserUpdateInput,
  ) {
    if (data.password) {
      data.password = await argon2.hash(
        data.password as string,
      );
    }

    return this.prisma.user.update({
      where: {
        id,
      },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.user.update({
      where: {
        id,
      },
      data: {
        isActive: false,
      },
    });
  }

  async updateRefreshToken(
    id: string,
    refreshToken: string | null,
  ) {
    return this.prisma.user.update({
      where: {
        id,
      },
      data: {
        refreshToken,
      },
    });
  }
}