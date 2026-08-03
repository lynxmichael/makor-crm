import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ResourceCategory, ResourceType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { FilterResourceDto } from './dto/filter-resource.dto';

const AUTHOR_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  avatar: true,
} as const;

interface UploadedFile {
  path: string;
  name: string;
  size: number;
}

@Injectable()
export class ResourcesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Liste groupée par catégorie plutôt qu'à plat.
   *
   * Une bibliothèque de formation se consulte par sujet : un agent qui bloque
   * sur les devis cherche la rubrique « Devis », pas la quatorzième ressource
   * ajoutée. Le groupement est fait ici pour que chaque écran n'ait pas à le
   * refaire.
   */
  async findAll(filter: FilterResourceDto, canSeeDrafts: boolean) {
    const { category, type, search } = filter;

    const resources = await this.prisma.resource.findMany({
      where: {
        // Un brouillon n'existe que pour celui qui peut le publier.
        ...(canSeeDrafts ? {} : { isPublished: true }),
        ...(category ? { category } : {}),
        ...(type ? { type } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: 'insensitive' as const } },
                { description: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      include: { createdBy: { select: AUTHOR_SELECT } },
      orderBy: [{ category: 'asc' }, { position: 'asc' }, { createdAt: 'desc' }],
    });

    const groups = new Map<ResourceCategory, typeof resources>();
    for (const resource of resources) {
      const bucket = groups.get(resource.category) ?? [];
      bucket.push(resource);
      groups.set(resource.category, bucket);
    }

    return {
      total: resources.length,
      groups: [...groups.entries()].map(([category, items]) => ({ category, items })),
    };
  }

  async findOne(id: string, canSeeDrafts: boolean) {
    const resource = await this.prisma.resource.findUnique({
      where: { id },
      include: { createdBy: { select: AUTHOR_SELECT } },
    });

    if (!resource || (!resource.isPublished && !canSeeDrafts)) {
      throw new NotFoundException('Ressource introuvable.');
    }

    return resource;
  }

  /**
   * Consultation comptabilisée séparément de la lecture : incrémenter dans
   * `findOne` gonflerait le compteur à chaque rafraîchissement de la liste.
   * C'est l'interface qui déclenche l'appel à l'ouverture réelle.
   */
  async registerView(id: string) {
    await this.prisma.resource.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return { id };
  }

  async create(dto: CreateResourceDto, authorId: string, file?: UploadedFile) {
    const type = dto.type ?? (file ? ResourceType.DOCUMENT : ResourceType.LIEN);
    this.assertPayloadMatchesType(type, dto, file);

    return this.prisma.resource.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        category: dto.category ?? ResourceCategory.GENERAL,
        type,
        url: dto.url ?? null,
        content: dto.content ?? null,
        position: dto.position ?? 0,
        isPublished: dto.isPublished ?? true,
        filePath: file?.path ?? null,
        fileName: file?.name ?? null,
        fileSize: file?.size ?? null,
        createdById: authorId,
      },
      include: { createdBy: { select: AUTHOR_SELECT } },
    });
  }

  async update(id: string, dto: UpdateResourceDto, file?: UploadedFile) {
    const existing = await this.prisma.resource.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Ressource introuvable.');

    const type = dto.type ?? existing.type;

    // On valide contre l'état résultant, pas contre le seul corps de la
    // requête : remplacer l'URL d'une vidéo ne doit pas exiger de renvoyer
    // tous les autres champs.
    this.assertPayloadMatchesType(
      type,
      { ...dto, url: dto.url ?? existing.url ?? undefined, content: dto.content ?? existing.content ?? undefined },
      file ?? (existing.filePath ? { path: existing.filePath, name: '', size: 0 } : undefined),
    );

    return this.prisma.resource.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.url !== undefined ? { url: dto.url } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.position !== undefined ? { position: dto.position } : {}),
        ...(dto.isPublished !== undefined ? { isPublished: dto.isPublished } : {}),
        ...(file
          ? { filePath: file.path, fileName: file.name, fileSize: file.size }
          : {}),
      },
      include: { createdBy: { select: AUTHOR_SELECT } },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.resource.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Ressource introuvable.');

    await this.prisma.resource.delete({ where: { id } });
    return { id };
  }

  /**
   * Chaque type porte son contenu ailleurs : un fichier, un lien, ou du texte.
   * Sans ce contrôle, on enregistre une vidéo sans URL — l'anomalie
   * n'apparaîtrait qu'au moment où un agent clique dessus.
   */
  private assertPayloadMatchesType(
    type: ResourceType,
    dto: { url?: string; content?: string },
    file?: UploadedFile,
  ) {
    if (type === ResourceType.DOCUMENT && !file) {
      throw new BadRequestException('Une ressource de type Document doit être accompagnée d’un fichier.');
    }

    if ((type === ResourceType.VIDEO || type === ResourceType.LIEN) && !dto.url) {
      throw new BadRequestException(
        `Une ressource de type ${type === ResourceType.VIDEO ? 'Vidéo' : 'Lien'} doit comporter une URL.`,
      );
    }

    if (type === ResourceType.ARTICLE && !dto.content?.trim()) {
      throw new BadRequestException('Une ressource de type Article doit comporter du contenu.');
    }
  }
}
