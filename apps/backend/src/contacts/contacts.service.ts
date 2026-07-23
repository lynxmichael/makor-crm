import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { Prisma } from '@prisma/client';

import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}
  create(dto: CreateContactDto) {
    return this.prisma.contact.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        jobTitle: dto.jobTitle,
        isPrimary: dto.isPrimary ?? false,

        customer: {
          connect: {
            id: dto.customerId,
          },
        },

        ...(dto.assignedToId && {
          assignedTo: {
            connect: {
              id: dto.assignedToId,
            },
          },
        }),
      },

      include: {
        customer: true,
        assignedTo: true,
      },
    });
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    customerId?: string;
  }) {
    const { page, limit, search, customerId } = params;

    const skip = (page - 1) * limit;

    const where: Prisma.ContactWhereInput = {
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
                {
                  phone: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {},

        customerId
          ? {
              customerId,
            }
          : {},
      ],
    };

    const [contacts, total] = await Promise.all([
        this.prisma.contact.findMany({
          where,

          include: {
            customer: true,
            assignedTo: true,
          },

          skip,
          take: limit,

          orderBy: {
            createdAt: 'desc',
          },
        }),

        this.prisma.contact.count({
          where,
        }),
      ]);

    return {
      data: contacts,

      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const contact = await this.prisma.contact.findUnique({
        where: {
          id,
        },

        include: {
          customer: true,
          assignedTo: true,
        },
      });

    if (!contact) {
      throw new NotFoundException('Contact introuvable');
    }

    return contact;
  }

  async update(id: string, dto: UpdateContactDto) {
    await this.findOne(id);

    return this.prisma.contact.update({
      where: {
        id,
      },

      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        jobTitle: dto.jobTitle,
        isPrimary: dto.isPrimary,

        ...(dto.customerId && {
          customer: {
            connect: {
              id: dto.customerId,
            },
          },
        }),

        ...(dto.assignedToId && {
          assignedTo: {
            connect: {
              id: dto.assignedToId,
            },
          },
        }),
      },

      include: {
        customer: true,
        assignedTo: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.contact.delete({
      where: {
        id,
      },
    });
  }
}
