import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

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

  /**
   * `currentUserId` est l'auteur de la création. Sans affectation explicite
   * dans le DTO, le prospect lui revient — comme à l'annuaire
   * (`DirectoryService.create`). Un prospect non affecté reste invisible
   * dans le portefeuille (scoping `assignedToId` de `findAll`) : il
   * n'apparaissait alors que dans l'annuaire, jamais dans « Prospects ».
   */
  async create(dto: CreateLeadDto, currentUserId?: string) {
    const assignedToId = dto.assignedToId ?? currentUserId;

    const created = await this.prisma.lead.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        company: dto.company,
        email: dto.email,
        phone: dto.phone,
        jobTitle: dto.jobTitle,
        sector: dto.sector,
        country: dto.country,
        city: dto.city,
        decisionMaker: dto.decisionMaker,
        value: dto.value,
        notes: dto.notes,

        source: dto.source,
        status: dto.status,

        ...(assignedToId && {
          assignedTo: { connect: { id: assignedToId } },
        }),
      },

      include: { assignedTo: true },
    });

    this.events.emit('workflow.trigger', {
      trigger: 'LEAD_CREATED',
      entityType: 'LEAD',
      entityId: created.id,
      actorId: assignedToId,
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
        country: dto.country,
        city: dto.city,
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

  /**
   * Convertit un prospect en client, sans ressaisie : crée la fiche Client
   * et son contact principal à partir des informations déjà saisies, puis
   * marque le prospect comme gagné.
   *
   * Un commercial ne convertit que ses propres prospects — `findOne` porte
   * déjà ce périmètre. Le doublon est refusé sur l'e-mail ou le téléphone,
   * comme à l'annuaire (`DirectoryService.create`) : convertir un prospect
   * qui correspond en réalité à un client déjà connu créerait deux fiches
   * divergentes.
   */
  async convertToCustomer(id: string, scopeToUserId?: string) {
    const lead = await this.findOne(id, scopeToUserId);

    if (lead.status === 'WON') {
      throw new BadRequestException('Ce prospect a déjà été converti en client.');
    }

    if (lead.email || lead.phone) {
      const existing = await this.prisma.customer.findFirst({
        where: {
          OR: [
            ...(lead.email ? [{ email: lead.email }] : []),
            ...(lead.phone ? [{ phone: lead.phone }] : []),
          ],
        },
        select: { id: true, companyName: true },
      });

      if (existing) {
        throw new ConflictException(
          `Un client existe déjà avec cet e-mail ou ce téléphone : ${existing.companyName}.`,
        );
      }
    }

    const customer = await this.prisma.customer.create({
      data: {
        code: `CUST-${Date.now()}`,
        companyName: lead.company ?? `${lead.firstName} ${lead.lastName}`,
        sector: lead.sector,
        country: lead.country,
        city: lead.city,
        email: lead.email,
        phone: lead.phone,
        assignedToId: lead.assignedToId,
        contacts: {
          create: {
            firstName: lead.firstName,
            lastName: lead.lastName,
            email: lead.email,
            phone: lead.phone,
            jobTitle: lead.jobTitle,
            isPrimary: true,
            assignedToId: lead.assignedToId,
          },
        },
      },
    });

    await this.prisma.lead.update({ where: { id: lead.id }, data: { status: 'WON' } });

    return customer;
  }
}
