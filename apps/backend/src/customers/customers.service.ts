import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { FilterCustomerDto } from './dto/filter-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateCustomerDto) {
    const { assignedToId, ...data } = dto;

    const code =
      data.code ?? `CUST-${Date.now()}`;

    return this.prisma.customer.create({
      data: {
        ...data,
        code,

        assignedTo: assignedToId
          ? {
              connect: {
                id: assignedToId,
              },
            }
          : undefined,
      },

      include: {
        assignedTo: true,
      },
    });
  }

  /**
   * Portefeuille clients.
   *
   * `scopeToUserId` restreint la liste aux clients dont l'appelant est le
   * chargé de compte. Appliqué au COMMERCIAL : sans cela, chacun voit et
   * modifie le portefeuille de tous, ce que le CDC §7 ne prévoit pas.
   *
   * Les autres profils gardent la vue complète — un superviseur doit voir
   * son équipe, un financier doit facturer n'importe quel client.
   */
  async findAll(filter: FilterCustomerDto, scopeToUserId?: string) {
    const {
      page = 1,
      limit = 10,
      search,
      country,
      status,
    } = filter;

    const where: any = scopeToUserId ? { assignedToId: scopeToUserId } : {};

    if (search) {
      where.OR = [
        {
          companyName: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          code: {
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
      ];
    }

    if (country) {
      where.country = country;
    }

    if (status) {
      where.status = status;
    }

    const [customers, total] =
      await Promise.all([
        this.prisma.customer.findMany({
          where,

          include: {
            assignedTo: true,
          },

          skip: (page - 1) * limit,

          take: limit,

          orderBy: {
            createdAt: 'desc',
          },
        }),

        this.prisma.customer.count({
          where,
        }),
      ]);

    return {
      data: customers,
      total,
      page,
      limit,
      totalPages: Math.ceil(
        total / limit,
      ),
    };
  }

  /**
   * Fiche client.
   *
   * `scopeToUserId` s'applique ici aussi : filtrer la liste sans filtrer
   * l'accès unitaire ne protège rien — il suffirait de deviner ou de
   * relever un identifiant pour ouvrir la fiche d'un collègue.
   *
   * Un client hors périmètre renvoie 404, pas 403 : répondre « interdit »
   * confirmerait son existence.
   */
  async findOne(id: string, scopeToUserId?: string) {
    const customer =
      await this.prisma.customer.findFirst({
        where: {
          id,
          ...(scopeToUserId ? { assignedToId: scopeToUserId } : {}),
        },

        include: {
          assignedTo: true,
        },
      });

    if (!customer) {
      throw new NotFoundException(
        'Client introuvable',
      );
    }

    return customer;
  }

  async update(
    id: string,
    dto: UpdateCustomerDto,
  scopeToUserId?: string,
  ) {
    await this.findOne(id, scopeToUserId);

    const {
      assignedToId,
      ...data
    } = dto;

    return this.prisma.customer.update({
      where: {
        id,
      },

      data: {
        ...data,

        assignedTo:
          assignedToId !== undefined
            ? {
                connect: {
                  id: assignedToId,
                },
              }
            : undefined,
      },

      include: {
        assignedTo: true,
      },
    });
  }

  async remove(id: string, scopeToUserId?: string) {
    await this.findOne(id, scopeToUserId);

    return this.prisma.customer.delete({
      where: {
        id,
      },
    });
  }
}
