import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  upload(file: Express.Multer.File, dto: CreateDocumentDto) {
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

  findAll(params?: {
    customerId?: string;
    dealId?: string;
    quoteId?: string;
    contractId?: string;
  }) {
    return this.prisma.document.findMany({
      where: {
        customerId: params?.customerId,
        dealId: params?.dealId,
        quoteId: params?.quoteId,
        contractId: params?.contractId,
      },

      include: {
        customer: true,
        deal: true,
        quote: true,
        contract: true,
        uploadedBy: true,
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
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

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.document.delete({
      where: {
        id,
      },
    });
  }
}
