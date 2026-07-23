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
        name: file.originalname,
        fileName: file.filename,

        path: file.path,

        mimeType: file.mimetype,

        size: file.size,

        type: dto.type,

        customer: dto.customerId
          ? {
              connect: {
                id: dto.customerId,
              },
            }
          : undefined,

        uploadedBy: {
          connect: {
            id: dto.uploadedById,
          },
        },
      },

      include: {
        customer: true,
        uploadedBy: true,
      },
    });
  }

  findAll() {
    return this.prisma.document.findMany({
      include: {
        customer: true,
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
          ? {
              connect: {
                id: dto.customerId,
              },
            }
          : undefined,
      },

      include: {
        customer: true,
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
