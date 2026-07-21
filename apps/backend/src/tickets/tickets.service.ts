import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

 create(dto: CreateTicketDto) {
    const { customerId, assignedToId, ...data } = dto;

    return this.prisma.ticket.create({
      data: {
        ...data,

        customer: {
          connect: {
            id: customerId,
          },
        },

        ...(assignedToId && {
          assignedTo: {
            connect: {
              id: assignedToId,
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

  findAll() {
    return this.prisma.ticket.findMany({
      include: {
        customer: true,
        assignedTo: true,
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
  const ticket = await this.prisma.ticket.findUnique({
      where: {
        id,
        },

        include: {
          customer: true,
          assignedTo: true,
        },
      });

    if (!ticket) {
      throw new NotFoundException('Ticket introuvable');
    }

    return ticket;
  }

  async update(id: string, dto: UpdateTicketDto) {
    await this.findOne(id);

    const { customerId, assignedToId, ...data } = dto;

    return this.prisma.ticket.update({
      where: {
        id,
      },

      data: {
        ...data,

        ...(customerId && {
          customer: {
            connect: {
              id: customerId,
            },
          },
        }),

        ...(assignedToId && {
          assignedTo: {
            connect: {
              id: assignedToId,
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

    return this.prisma.ticket.delete({
      where: {
        id,
      },
    });
  }
}
