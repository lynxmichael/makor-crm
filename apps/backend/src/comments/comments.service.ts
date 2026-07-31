import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CommentEntity } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { FilterCommentDto } from './dto/filter-comment.dto';

/** Auteur affiché à côté de chaque commentaire — jamais plus que nécessaire. */
const AUTHOR_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  avatar: true,
  jobTitle: true,
} as const;

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: EventEmitter2,
  ) {}

  /**
   * Fil d'une entité. Les réponses sont imbriquées sous leur parent plutôt
   * que rendues à plat : un fil de discussion se lit par échange, pas par
   * ordre d'arrivée.
   */
  async findAll(filter: FilterCommentDto) {
    const { entityType, entityId, page, limit } = filter;

    const where = {
      entityType,
      entityId: entityId ?? null,
      parentId: null,
    };

    const [roots, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        include: {
          author: { select: AUTHOR_SELECT },
          replies: {
            include: { author: { select: AUTHOR_SELECT } },
            orderBy: { createdAt: 'asc' },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.comment.count({ where }),
    ]);

    return {
      data: roots,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** Compteur pour les pastilles d'onglet, sans charger les commentaires. */
  async countFor(entityType: CommentEntity, entityId?: string) {
    const count = await this.prisma.comment.count({
      where: { entityType, entityId: entityId ?? null },
    });
    return { count };
  }

  async create(dto: CreateCommentDto, authorId: string) {
    // Une réponse hérite forcément de l'entité de son parent : laisser le
    // client la fournir ouvrirait la porte à des fils incohérents.
    if (dto.parentId) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: dto.parentId },
        select: { id: true, entityType: true, entityId: true, parentId: true },
      });

      if (!parent) {
        throw new NotFoundException('Le commentaire auquel vous répondez n’existe plus.');
      }

      if (parent.parentId) {
        throw new ForbiddenException(
          'Les réponses ne peuvent pas être imbriquées au-delà d’un niveau.',
        );
      }

      dto.entityType = parent.entityType;
      dto.entityId = parent.entityId ?? undefined;
    }

    const comment = await this.prisma.comment.create({
      data: {
        body: dto.body,
        entityType: dto.entityType,
        entityId: dto.entityId ?? null,
        parentId: dto.parentId ?? null,
        mentionedUserIds: dto.mentionedUserIds ?? [],
        authorId,
      },
      include: { author: { select: AUTHOR_SELECT } },
    });

    // Les personnes mentionnées sont prévenues ; l'auteur ne se notifie pas
    // lui-même s'il se mentionne par mégarde.
    for (const userId of comment.mentionedUserIds) {
      if (userId === authorId) continue;
      this.events.emit('comment.mentioned', { comment, userId });
    }

    this.events.emit('comment.created', comment);

    return comment;
  }

  async update(id: string, dto: UpdateCommentDto, user: { id: string; role: string }) {
    const comment = await this.findOrFail(id);
    this.assertCanModify(comment, user);

    return this.prisma.comment.update({
      where: { id },
      data: { body: dto.body, editedAt: new Date() },
      include: { author: { select: AUTHOR_SELECT } },
    });
  }

  async remove(id: string, user: { id: string; role: string }) {
    const comment = await this.findOrFail(id);
    this.assertCanModify(comment, user);

    await this.prisma.comment.delete({ where: { id } });

    // Trace conservée même quand le contenu disparaît : c'est précisément
    // l'intérêt du journal d'audit (CDC §4.16).
    await this.audit.create({
      action: 'DELETE',
      entity: 'Comment',
      entityId: id,
      description: `Commentaire supprimé sur ${comment.entityType}${
        comment.entityId ? ` ${comment.entityId}` : ''
      }`,
      userId: user.id,
    });

    return { id };
  }

  private async findOrFail(id: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('Commentaire introuvable.');
    return comment;
  }

  /**
   * Modifier ou supprimer est réservé à l'auteur. Le Super Admin garde la
   * main pour la modération — sans quoi un commentaire déplacé resterait
   * en place indéfiniment.
   */
  private assertCanModify(
    comment: { authorId: string },
    user: { id: string; role: string },
  ) {
    if (comment.authorId !== user.id && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'Seul l’auteur d’un commentaire peut le modifier ou le supprimer.',
      );
    }
  }
}
