import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

import { Prisma, User } from '@prisma/client';

import * as argon2 from 'argon2';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.email },
          ...(dto.phone ? [{ phone: dto.phone }] : []),
        ],
      },
    });

    if (existing) {
      throw new ConflictException(
        'Un utilisateur possède déjà cet email ou ce numéro.',
      );
    }

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

        ...(dto.companyId && {
          company: {
            connect: {
              id: dto.companyId,
            },
          },
        }),
      },

      include: {
        role: true,
        department: true,
        company: true,
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
    const { page, limit, search, role, department } = params;

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
          company: true,
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
        company: true,
      },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
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
        company: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findById(id);

    const data: Prisma.UserUpdateInput = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      avatar: dto.avatar,
      jobTitle: dto.jobTitle,
      isActive: dto.isActive,
    };

    if (dto.password) {
      data.password = await argon2.hash(dto.password);
    }

    if (dto.roleId) {
      data.role = {
        connect: {
          id: dto.roleId,
        },
      };
    }

    if (dto.departmentId) {
      data.department = {
        connect: {
          id: dto.departmentId,
        },
      };
    }

    if (dto.companyId) {
      data.company = {
        connect: {
          id: dto.companyId,
        },
      };
    }

    return this.prisma.user.update({
      where: {
        id,
      },

      data,

      include: {
        role: true,
        department: true,
        company: true,
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);

    return this.prisma.user.update({
      where: {
        id,
      },

      data: {
        isActive: false,
      },
    });
  }

  async updateRefreshToken(id: string, refreshToken: string | null) {
    return this.prisma.user.update({
      where: {
        id,
      },

      data: {
        refreshToken,
      },
    });
  }

  async findActive() {
    return this.prisma.user.findMany({
      where: {
        isActive: true,
      },

      include: {
        role: true,
        department: true,
        company: true,
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async stats() {
    const [total, active, inactive] = await Promise.all([
      this.prisma.user.count(),

      this.prisma.user.count({
        where: {
          isActive: true,
        },
      }),

      this.prisma.user.count({
        where: {
          isActive: false,
        },
      }),
    ]);

    return {
      total,
      active,
      inactive,
    };
  }
}
