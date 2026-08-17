import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { DocumentEventType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  upload(file: Express.Multer.File, dto: CreateDocumentDto) {
    // Sans ce garde-fou, un envoi sans pièce plante sur `file.filename` avec
    // une erreur illisible côté client.
    if (!file) {
      throw new BadRequestException('Aucun fichier reçu.');
    }

    return this.prisma.document.create({
      data: {
        name: dto.name ?? file.originalname,
        fileName: file.filename,

        path: file.path,

        mimeType: file.mimetype,

        size: file.size,

        type: dto.type,

        customer: dto.customerId
          ? { connect: { id: dto.customerId } }
          : undefined,

        deal: dto.dealId ? { connect: { id: dto.dealId } } : undefined,

        quote: dto.quoteId ? { connect: { id: dto.quoteId } } : undefined,

        contract: dto.contractId
          ? { connect: { id: dto.contractId } }
          : undefined,

        uploadedBy: {
          connect: {
            id: dto.uploadedById,
          },
        },
      },

      include: {
        customer: true,
        deal: true,
        quote: true,
        contract: true,
        uploadedBy: true,
      },
    });
  }

  /**
   * Liste paginée.
   *
   * La réponse suit la forme `{ data, total, page, limit, totalPages }`
   * commune à tous les modules : l'écran générique lit `data`, et un tableau
   * nu lui donnait une liste vide quel que soit le contenu réel.
   */
  async findAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    customerId?: string;
    dealId?: string;
    quoteId?: string;
    contractId?: string;
    scopeToUserId?: string;
  }) {
    const page = Math.max(1, Number(params?.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(params?.limit) || 20));

    const where = {
      ...(params?.customerId ? { customerId: params.customerId } : {}),
      ...(params?.dealId ? { dealId: params.dealId } : {}),
      ...(params?.quoteId ? { quoteId: params.quoteId } : {}),
      ...(params?.contractId ? { contractId: params.contractId } : {}),
      ...(params?.type ? { type: params.type as never } : {}),
      ...(params?.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' as const } },
              { fileName: { contains: params.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),

      // Périmètre : un commercial ne voit que les documents des clients dont
      // il a la charge, plus ceux qu'il a lui-même déposés. Sans cette
      // seconde condition, un document déposé sans client rattaché
      // disparaissait pour son propre auteur.
      ...(params?.scopeToUserId
        ? {
            OR: [
              { customer: { assignedToId: params.scopeToUserId } },
              { uploadedById: params.scopeToUserId },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        include: {
          customer: true,
          deal: true,
          quote: true,
          contract: true,
          uploadedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.document.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  async findOne(id: string) {
    const document =
      await this.prisma.document.findUnique({
        where: {
          id,
        },

        include: {
          customer: true,
          deal: true,
          quote: true,
          contract: true,
          uploadedBy: true,
        },
      });

    if (!document) {
      throw new NotFoundException('Document introuvable');
    }

    return document;
  }

  async update(id: string, dto: UpdateDocumentDto) {
    await this.findOne(id);

    return this.prisma.document.update({
      where: {
        id,
      },

      data: {
        name: dto.name,

        type: dto.type,

        customer: dto.customerId
          ? { connect: { id: dto.customerId } }
          : undefined,

        deal: dto.dealId ? { connect: { id: dto.dealId } } : undefined,

        quote: dto.quoteId ? { connect: { id: dto.quoteId } } : undefined,

        contract: dto.contractId
          ? { connect: { id: dto.contractId } }
          : undefined,
      },

      include: {
        customer: true,
        deal: true,
        quote: true,
        contract: true,
        uploadedBy: true,
      },
    });
  }

  /**
   * Enregistre une consultation, un téléchargement ou un envoi
   * (demande du 31/07/2026).
   *
   * `userId` est nul quand l'action vient du client, qui n'a pas de compte :
   * c'est justement le cas le plus intéressant — savoir si le devis envoyé
   * a été ouvert.
   */
  async trackEvent(
    documentId: string,
    type: DocumentEventType,
    context: { userId?: string; ipAddress?: string; userAgent?: string } = {},
  ) {
    const exists = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true },
    });

    if (!exists) throw new NotFoundException('Document introuvable.');

    return this.prisma.documentEvent.create({
      data: {
        documentId,
        type,
        userId: context.userId ?? null,
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
      },
    });
  }

  /** Statistiques de consultation d'un document. */
  async stats(documentId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, name: true, type: true, createdAt: true },
    });

    if (!document) throw new NotFoundException('Document introuvable.');

    const [grouped, recent, firstView] = await Promise.all([
      this.prisma.documentEvent.groupBy({
        by: ['type'],
        where: { documentId },
        _count: { _all: true },
      }),
      this.prisma.documentEvent.findMany({
        where: { documentId },
        include: { user: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        take: 25,
      }),
      this.prisma.documentEvent.findFirst({
        where: { documentId, type: { in: ['VIEWED', 'PREVIEWED'] }, userId: null },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
    ]);

    const counts = Object.fromEntries(grouped.map((g) => [g.type, g._count._all]));

    return {
      document,
      counts: {
        viewed: counts.VIEWED ?? 0,
        previewed: counts.PREVIEWED ?? 0,
        downloaded: counts.DOWNLOADED ?? 0,
        sent: counts.SENT ?? 0,
      },
      // Le premier accès sans utilisateur connecté est, selon toute
      // vraisemblance, celui du client destinataire.
      firstClientAccessAt: firstView?.createdAt ?? null,
      recent,
    };
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.document.delete({
      where: {
        id,
      },
    });
  }
}
