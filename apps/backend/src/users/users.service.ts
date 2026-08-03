import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

import { Prisma, User } from '@prisma/client';

import * as argon2 from 'argon2';

/** Inclusion standard : rôle + permissions du rôle, nécessaires aux guards
 * RBAC (RolesGuard, PermissionsGuard). */
const USER_WITH_ROLE = {
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
} satisfies Prisma.UserInclude;

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
      },

      include: USER_WITH_ROLE,
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

        include: USER_WITH_ROLE,

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

      include: USER_WITH_ROLE,
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },

      include: USER_WITH_ROLE,
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    return user;
  }

  /**
   * Modification d'un compte par un administrateur.
   *
   * `actorId` permet d'appliquer deux garde-fous que l'interface seule ne
   * peut pas garantir — l'API reste appelable directement.
   */
  async update(id: string, dto: UpdateUserDto, actorId?: string) {
    const target = await this.findById(id);

    // Un administrateur ne se rétrograde pas lui-même : la manœuvre est
    // irréversible dès qu'il perd le droit de se réattribuer un rôle.
    if (actorId && actorId === id && dto.roleId && dto.roleId !== target.roleId) {
      throw new BadRequestException(
        'Vous ne pouvez pas modifier votre propre rôle. Demandez à un autre Super administrateur.',
      );
    }

    // Le dernier Super administrateur actif ne peut être ni rétrogradé ni
    // désactivé : sans lui, plus personne ne peut administrer le CRM.
    const losesSuperAdmin =
      (dto.roleId && dto.roleId !== target.roleId) || dto.isActive === false;

    if (losesSuperAdmin && target.role?.name === 'SUPER_ADMIN') {
      await this.assertNotLastSuperAdmin(id);
    }

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

    return this.prisma.user.update({
      where: {
        id,
      },

      data,

      include: USER_WITH_ROLE,
    });
  }

  /** Désactivation logique (CDC §3 : "désactivation des comptes"). */
  /** Désactivation — on ne supprime jamais un compte : ses opportunités,
   *  devis et écritures d'audit lui restent rattachés. */
  async remove(id: string) {
    const target = await this.findById(id);

    if (target.role?.name === 'SUPER_ADMIN') {
      await this.assertNotLastSuperAdmin(id);
    }

    return this.prisma.user.update({
      where: {
        id,
      },

      data: {
        isActive: false,
      },
    });
  }

  async findActive() {
    return this.prisma.user.findMany({
      where: {
        isActive: true,
      },

      include: USER_WITH_ROLE,

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

  // ---------------------------------------------------------------------
  // Sécurité du compte : verrouillage après échecs, historique de
  // connexion (CDC §2.4, §3, §8.2)
  // ---------------------------------------------------------------------

  async registerFailedLogin(userId: string, maxAttempts = 5, lockMinutes = 15) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: { increment: 1 } },
    });

    if (user.failedLoginAttempts >= maxAttempts) {
      const lockedUntil = new Date(Date.now() + lockMinutes * 60_000);

      return this.prisma.user.update({
        where: { id: userId },
        data: { lockedUntil },
      });
    }

    return user;
  }

  async resetFailedLogins(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLogin: new Date() },
    });
  }

  async updatePassword(userId: string, hashedPassword: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }

  // ---------------------------------------------------------------------
  // Double authentification — TOTP (CDC §2.4, §8.2)
  // ---------------------------------------------------------------------

  async setTwoFactorSecret(userId: string, secret: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });
  }

  async enableTwoFactor(userId: string, recoveryCodes: string[]) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorRecoveryCodes: recoveryCodes,
      },
    });
  }

  /**
   * Réinitialisation par un administrateur. Distincte de `disableTwoFactor`,
   * qui est l'action volontaire du titulaire : ici c'est un tiers qui agit,
   * d'où la vérification que la cible existe et le retour d'un résumé
   * exploitable par le journal d'audit.
   */
  async resetTwoFactorAsAdmin(targetUserId: string, actorId: string) {
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    if (!target) throw new NotFoundException('Utilisateur introuvable.');

    await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorRecoveryCodes: [],
      },
    });

    return {
      id: target.id,
      email: target.email,
      resetBy: actorId,
      message:
        'Double authentification réinitialisée. Le compte devra la reconfigurer à sa prochaine connexion si son rôle l’impose.',
    };
  }

  async disableTwoFactor(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorRecoveryCodes: [],
      },
    });
  }

  async consumeRecoveryCode(userId: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    if (!user.twoFactorRecoveryCodes.includes(code)) {
      return false;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorRecoveryCodes: user.twoFactorRecoveryCodes.filter(
          (c) => c !== code,
        ),
      },
    });

    return true;
  }

  // ---------------------------------------------------------------------
  // Sessions — refresh tokens multi-appareils (CDC §2.1, §2.4)
  // ---------------------------------------------------------------------

  async createRefreshToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }) {
    return this.prisma.refreshToken.create({ data });
  }

  async findRefreshTokenByHash(tokenHash: string) {
    return this.prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null },
      include: { user: { include: USER_WITH_ROLE } },
    });
  }

  async revokeRefreshToken(id: string) {
    return this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllUserRefreshTokens(userId: string) {
    return this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Refuse l'opération s'il ne reste aucun autre Super administrateur actif. */
  private async assertNotLastSuperAdmin(excludedUserId: string) {
    const remaining = await this.prisma.user.count({
      where: {
        id: { not: excludedUserId },
        isActive: true,
        role: { name: 'SUPER_ADMIN' },
      },
    });

    if (remaining === 0) {
      throw new BadRequestException(
        'Ce compte est le dernier Super administrateur actif : il ne peut être ni désactivé ni rétrogradé.',
      );
    }
  }
}
