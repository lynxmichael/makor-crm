import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

import { PdfService } from '../common/pdf/pdf.service';
import { SettingsService } from '../settings/settings.service';
import { MailService } from '../mail/mail.service';
import { AuditService } from '../audit/audit.service';

import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
    private readonly settingsService: SettingsService,
    private readonly mailService: MailService,
    private readonly auditService: AuditService,
  ) {}

  private readonly include = {
    customer: true,
    purchaseOrder: true,
    createdBy: true,
    invoices: true,
  } satisfies Prisma.ContractInclude;

  private async nextNumber(tx: Prisma.TransactionClient) {
    const count = await tx.contract.count();
    return `CTR-${String(count + 1).padStart(6, '0')}`;
  }

  /**
   * Génère le contrat à partir d'un bon de commande signé (CDC §4.9).
   * Un seul contrat peut être généré par bon de commande.
   */
  async createFromPurchaseOrder(
    purchaseOrderId: string,
    userId: string,
    title?: string,
  ) {
    const purchaseOrder = await this.prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: { contract: true },
    });

    if (!purchaseOrder) {
      throw new NotFoundException('Bon de commande introuvable');
    }

    if (purchaseOrder.status !== 'SIGNED') {
      throw new BadRequestException(
        'Seul un bon de commande signé peut donner lieu à un contrat.',
      );
    }

    if (purchaseOrder.contract) {
      throw new BadRequestException(
        'Un contrat a déjà été généré pour ce bon de commande.',
      );
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const number = await this.nextNumber(tx);

      return tx.contract.create({
        data: {
          number,
          title: title ?? `Contrat commercial ${number}`,

          amount: purchaseOrder.amount,
          startDate: new Date(),
          status: 'DRAFT',

          customer: { connect: { id: purchaseOrder.customerId } },
          createdBy: { connect: { id: userId } },
          purchaseOrder: { connect: { id: purchaseOrder.id } },
        },

        include: this.include,
      });
    });

    await this.auditService.create({
      action: 'CREATE',
      entity: 'Contract',
      entityId: created.id,
      description: `Contrat ${created.number} généré depuis le bon de commande ${purchaseOrder.number}`,
      userId,
    });

    return created;
  }

  async create(dto: CreateContractDto, userId: string) {
    const number = await this.prisma.$transaction((tx) => this.nextNumber(tx));

    return this.prisma.contract.create({
      data: {
        number,
        title: dto.title,
        description: dto.description,
        amount: dto.amount,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        status: 'DRAFT',

        customer: { connect: { id: dto.customerId } },
        createdBy: { connect: { id: userId } },
      },

      include: this.include,
    });
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    customerId?: string;
  }) {
    const { page, limit, search, status, customerId } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.ContractWhereInput = {
      AND: [
        search
          ? {
              OR: [
                { number: { contains: search, mode: 'insensitive' } },
                { title: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {},

        status ? { status: status as any } : {},
        customerId ? { customerId } : {},
      ],
    };

    const [contracts, total] = await Promise.all([
      this.prisma.contract.findMany({
        where,
        include: this.include,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),

      this.prisma.contract.count({ where }),
    ]);

    return {
      data: contracts,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: this.include,
    });

    if (!contract) {
      throw new NotFoundException('Contrat introuvable');
    }

    return contract;
  }

  async update(id: string, dto: UpdateContractDto) {
    await this.findOne(id);

    return this.prisma.contract.update({
      where: { id },

      data: {
        title: dto.title,
        description: dto.description,
        amount: dto.amount,

        startDate: dto.startDate ? new Date(dto.startDate) : undefined,

        endDate:
          dto.endDate !== undefined
            ? dto.endDate
              ? new Date(dto.endDate)
              : null
            : undefined,

        ...(dto.customerId && {
          customer: { connect: { id: dto.customerId } },
        }),
      },

      include: this.include,
    });
  }

  async remove(id: string) {
    const existing = await this.findOne(id);

    if (existing.status === 'ACTIVE') {
      throw new BadRequestException(
        'Un contrat actif ne peut pas être supprimé — utilisez la résiliation.',
      );
    }

    return this.prisma.contract.delete({ where: { id } });
  }

  private async buildPdf(id: string): Promise<Buffer> {
    const contract = await this.findOne(id);
    const org = await this.settingsService.getOrganizationSettings();

    return this.pdfService.generateCommercialDocument(
      {
        companyName: org.companyName,
        address: org.address,
        email: org.email,
        phone: org.phone,
      },
      {
        documentTitle: 'CONTRAT',
        number: contract.number,
        date: contract.startDate,
        status: contract.status,
        customerName: contract.customer.companyName,
        customerAddress: contract.customer.address,
        customerEmail: contract.customer.email,
        customerPhone: contract.customer.phone,
        total: Number(contract.amount),
        currency: org.defaultCurrency,
        notes: contract.description,
        extraLines: [
          { label: 'Date de début', value: contract.startDate.toLocaleDateString('fr-FR') },
          ...(contract.endDate
            ? [{ label: 'Date de fin', value: contract.endDate.toLocaleDateString('fr-FR') }]
            : []),
        ],
      },
    );
  }

  async getPdf(id: string) {
    const contract = await this.findOne(id);
    const pdf = await this.buildPdf(id);
    return { pdf, number: contract.number };
  }

  /** Transmet le contrat au client par email, directement depuis le CRM (CDC §4.9). */
  async send(id: string, userId?: string) {
    const contract = await this.findOne(id);

    if (!contract.customer.email) {
      throw new BadRequestException(
        "Le client n'a pas d'adresse email enregistrée.",
      );
    }

    const pdf = await this.buildPdf(id);

    await this.mailService.sendContract(contract.customer.email, contract.number, {
      filename: `${contract.number}.pdf`,
      content: pdf,
    });

    await this.auditService.create({
      action: 'UPDATE',
      entity: 'Contract',
      entityId: id,
      description: `Contrat ${contract.number} transmis au client par email`,
      userId,
    });

    return contract;
  }

  /**
   * Enregistre la signature du contrat par le client (V1 : retour signé
   * par email/GED — signature électronique intégrée en V2, cf. CDC §5).
   */
  async markSigned(id: string, userId?: string) {
    const contract = await this.findOne(id);

    if (contract.status !== 'DRAFT') {
      throw new BadRequestException(
        'Seul un contrat au statut "brouillon" peut être marqué comme signé.',
      );
    }

    const updated = await this.prisma.contract.update({
      where: { id },
      data: { status: 'ACTIVE', signedAt: new Date() },
      include: this.include,
    });

    await this.auditService.create({
      action: 'UPDATE',
      entity: 'Contract',
      entityId: id,
      description: `Contrat ${contract.number} signé et activé`,
      userId,
    });

    return updated;
  }

  async suspend(id: string) {
    await this.findOne(id);

    return this.prisma.contract.update({
      where: { id },
      data: { status: 'SUSPENDED' },
      include: this.include,
    });
  }

  async terminate(id: string) {
    await this.findOne(id);

    return this.prisma.contract.update({
      where: { id },
      data: { status: 'TERMINATED' },
      include: this.include,
    });
  }
}
