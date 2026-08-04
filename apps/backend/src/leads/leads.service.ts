import { Injectable, NotFoundException } from '@nestjs/common';

import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';

import { Prisma } from '@prisma/client';

import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  async create(dto: CreateLeadDto) {
    const created = await this.prisma.lead.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        company: dto.company,
        email: dto.email,
        phone: dto.phone,
        jobTitle: dto.jobTitle,
        sector: dto.sector,
        decisionMaker: dto.decisionMaker,
        value: dto.value,
        notes: dto.notes,

        source: dto.source,
        status: dto.status,

        ...(dto.assignedToId && {
          assignedTo: { connect: { id: dto.assignedToId } },
        }),
      },

      include: { assignedTo: true },
    });

    this.events.emit('workflow.trigger', {
      trigger: 'LEAD_CREATED',
      entityType: 'LEAD',
      entityId: created.id,
      actorId: dto.assignedToId,
      payload: {
        firstName: created.firstName,
        lastName: created.lastName,
        company: created.company,
        source: created.source,
        value: Number(created.value ?? 0),
      },
    });

    return created;
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    source?: string;
    assignedToId?: string;
  }) {
    const { page, limit, search, status, source, assignedToId } = params;

    const skip = (page - 1) * limit;

    const where: Prisma.LeadWhereInput = {
      AND: [
        search
          ? {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { company: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {},

        status ? { status: status as any } : {},
        source ? { source: source as any } : {},
        assignedToId ? { assignedToId } : {},
      ],
    };

    const [leads, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        include: { assignedTo: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),

      this.prisma.lead.count({ where }),
    ]);

    return {
      data: leads,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Un prospect hors périmètre renvoie 404 : un 403 confirmerait son existence. */
  async findOne(id: string, scopeToUserId?: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, ...(scopeToUserId ? { assignedToId: scopeToUserId } : {}) },
      include: {
        assignedTo: true,
        deals: { include: { stage: true } },
        activities: { orderBy: { dueDate: 'asc' } },
      },
    });

    if (!lead) {
      throw new NotFoundException('Prospect introuvable');
    }

    return lead;
  }

  async update(id: string, dto: UpdateLeadDto, scopeToUserId?: string) {
    await this.findOne(id, scopeToUserId);

    return this.prisma.lead.update({
      where: { id },

      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        company: dto.company,
        email: dto.email,
        phone: dto.phone,
        jobTitle: dto.jobTitle,
        sector: dto.sector,
        decisionMaker: dto.decisionMaker,
        value: dto.value,
        notes: dto.notes,
        status: dto.status,
        source: dto.source,

        ...(dto.assignedToId && {
          assignedTo: { connect: { id: dto.assignedToId } },
        }),
      },

      include: { assignedTo: true },
    });
  }

  async remove(id: string, scopeToUserId?: string) {
    await this.findOne(id, scopeToUserId);

    return this.prisma.lead.delete({ where: { id } });
  }
}
