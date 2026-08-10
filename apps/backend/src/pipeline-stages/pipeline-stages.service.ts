import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CanonicalStage, Prisma, type PipelineStage } from '@prisma/client';

import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePipelineStageDto,
  ReorderPipelineStagesDto,
  UpdatePipelineStageDto,
} from './dto/pipeline-stage.dto';

/**
 * Pipeline commercial administrable depuis l'écran (D24) : le Super Admin
 * crée, renomme, recolore, réordonne et retire les colonnes du Kanban sans
 * mise en production.
 *
 * Deux invariants tiennent cette liberté :
 *
 * 1. **`canonicalStage` est obligatoire.** Le libellé d'une colonne est libre
 *    et changeant ; le reporting, lui, agrège sur les six étapes du CDC §4.6.
 *    Renommer « Closing » en « Signature » ne doit rien casser.
 * 2. **Le pipeline garde toujours une sortie gagnante.** Sans étape rattachée
 *    à `VENTE`, plus rien ne clôture une affaire : ni la conversion
 *    prospect → client (CDC §4.3), ni le chiffre d'affaires du reporting.
 */
@Injectable()
export class PipelineStagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /** Les étapes archivées ne participent plus au pipeline vivant. */
  private readonly active = { isArchived: false };

  async create(dto: CreatePipelineStageDto, userId?: string) {
    await this.assertNameIsFree(dto.name);

    const order = dto.order ?? (await this.nextOrder());

    const stage = await this.prisma.pipelineStage.create({
      data: {
        name: dto.name,
        canonicalStage: dto.canonicalStage,
        order,
        isClosedWon: dto.isClosedWon ?? false,
        isClosedLost: dto.isClosedLost ?? false,
        requiresSignedOrder: dto.requiresSignedOrder ?? false,
        color: dto.color ?? '#6366f1',
      },
    });

    await this.auditService.create({
      action: 'CREATE',
      entity: 'PipelineStage',
      entityId: stage.id,
      description: `Étape "${stage.name}" créée (${stage.canonicalStage}), rang ${stage.order}`,
      userId,
    });

    return stage;
  }

  findAll(includeArchived = false) {
    return this.prisma.pipelineStage.findMany({
      where: includeArchived ? {} : this.active,
      orderBy: [{ isArchived: 'asc' }, { order: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { deals: true } },
      },
    });
  }

  async findOne(id: string) {
    const stage = await this.prisma.pipelineStage.findUnique({ where: { id } });

    if (!stage) {
      throw new NotFoundException('Étape de pipeline introuvable');
    }

    return stage;
  }

  async update(id: string, dto: UpdatePipelineStageDto, userId?: string) {
    const stage = await this.findOne(id);

    if (stage.isArchived) {
      throw new BadRequestException(
        `L'étape "${stage.name}" est archivée : elle n'est plus modifiable.`,
      );
    }

    if (dto.name && dto.name !== stage.name) {
      await this.assertNameIsFree(dto.name);
    }

    // Retirer la dernière sortie gagnante par un simple changement de
    // rattachement est aussi destructeur que la supprimer.
    if (dto.canonicalStage && dto.canonicalStage !== stage.canonicalStage) {
      await this.assertWinningStageSurvives(stage, dto.canonicalStage);
    }

    const updated = await this.prisma.pipelineStage.update({
      where: { id },
      data: dto,
    });

    await this.auditService.create({
      action: 'UPDATE',
      entity: 'PipelineStage',
      entityId: id,
      description: this.describeChanges(stage, updated),
      userId,
    });

    return updated;
  }

  /**
   * Réécrit l'ordre complet du pipeline. C'est le seul chemin pour déplacer
   * une colonne : traiter les rangs un par un laisserait des doublons ou des
   * trous entre deux appels. `PipelineStage.order` a perdu son unicité en base
   * précisément pour que les rangs intermédiaires de cette transaction soient
   * légaux.
   */
  async reorder(dto: ReorderPipelineStagesDto, userId?: string) {
    const stages = await this.prisma.pipelineStage.findMany({
      where: this.active,
    });
    const known = new Set(stages.map((s) => s.id));
    const submitted = new Set(dto.stageIds);

    if (submitted.size !== dto.stageIds.length) {
      throw new BadRequestException('La liste des étapes contient un doublon.');
    }

    const unknown = dto.stageIds.filter((id) => !known.has(id));

    if (unknown.length > 0) {
      throw new BadRequestException(
        `Étape(s) inconnue(s) ou archivée(s) : ${unknown.join(', ')}. Le réordonnancement porte sur le pipeline actif.`,
      );
    }

    // Une liste partielle signifie presque toujours un écran désynchronisé :
    // l'appliquer laisserait les étapes absentes à leur ancien rang, donc
    // mélangées aux nouveaux. Mieux vaut refuser et faire recharger.
    const missing = stages.filter((s) => !submitted.has(s.id));

    if (missing.length > 0) {
      throw new BadRequestException(
        `Le réordonnancement doit porter sur les ${stages.length} étapes actives ; ${missing.length} manque(nt) : ${missing
          .map((s) => s.name)
          .join(', ')}.`,
      );
    }

    await this.prisma.$transaction(
      dto.stageIds.map((id, index) =>
        this.prisma.pipelineStage.update({
          where: { id },
          data: { order: index + 1 },
        }),
      ),
    );

    await this.auditService.create({
      action: 'UPDATE',
      entity: 'PipelineStage',
      description: `Pipeline réordonné : ${dto.stageIds.length} étapes`,
      userId,
    });

    return this.findAll();
  }

  /**
   * Retire une colonne du pipeline.
   *
   * Les opportunités qu'elle porte ne sont jamais perdues : elles sont
   * déplacées vers une étape de destination **explicitement demandée**, et
   * chaque déplacement laisse une ligne d'historique — le reporting de délai
   * moyen doit pouvoir expliquer le saut.
   *
   * L'étape elle-même n'est effacée que si elle n'a jamais été traversée.
   * Sinon elle est archivée : `DealStageHistory` la référence en
   * `onDelete: Restrict`, et cet historique est la matière du reporting.
   */
  async remove(id: string, destinationStageId?: string, userId?: string) {
    const stage = await this.findOne(id);

    if (stage.isArchived) {
      throw new BadRequestException(
        `L'étape "${stage.name}" est déjà archivée.`,
      );
    }

    const remaining = await this.prisma.pipelineStage.count({
      where: { ...this.active, id: { not: id } },
    });

    if (remaining === 0) {
      throw new BadRequestException(
        'Impossible de retirer la dernière étape : le pipeline ne peut pas être vide.',
      );
    }

    await this.assertWinningStageSurvives(stage, null);

    const dealsOnStage = await this.prisma.deal.count({
      where: { stageId: id },
    });
    let destination: PipelineStage | null = null;

    if (dealsOnStage > 0) {
      if (!destinationStageId) {
        throw new BadRequestException(
          `${dealsOnStage} opportunité(s) sont sur l'étape "${stage.name}". Indiquez l'étape de destination (destinationStageId) vers laquelle les déplacer.`,
        );
      }

      if (destinationStageId === id) {
        throw new BadRequestException(
          "L'étape de destination ne peut pas être l'étape retirée.",
        );
      }

      destination = await this.findOne(destinationStageId);

      if (destination.isArchived) {
        throw new BadRequestException(
          `L'étape de destination "${destination.name}" est archivée : choisissez une étape active.`,
        );
      }
    }

    // Archiver plutôt que supprimer dès que l'étape laisse une trace : soit
    // elle a déjà été traversée, soit le déplacement ci-dessous va créer des
    // lignes d'historique qui la citent en `fromStage`. Les effacer viderait
    // la colonne « venait de » (`onDelete: SetNull`) juste après l'avoir
    // remplie. Seule une étape qui n'a jamais rien porté disparaît vraiment.
    const traversed =
      dealsOnStage > 0 ||
      (await this.prisma.dealStageHistory.count({
        where: { OR: [{ toStageId: id }, { fromStageId: id }] },
      })) > 0;

    await this.prisma.$transaction(async (tx) => {
      if (destination) {
        const deals = await tx.deal.findMany({
          where: { stageId: id },
          select: { id: true },
        });

        await tx.deal.updateMany({
          where: { stageId: id },
          data: { stageId: destination.id },
        });

        await tx.dealStageHistory.createMany({
          data: deals.map((deal) => ({
            dealId: deal.id,
            fromStageId: id,
            toStageId: destination.id,
            changedById: userId,
            note: `Déplacement automatique : l'étape "${stage.name}" a été retirée du pipeline.`,
          })),
        });
      }

      if (traversed) {
        await tx.pipelineStage.update({
          where: { id },
          data: {
            isArchived: true,
            name: await this.archivedName(tx, stage.name),
          },
        });
      } else {
        await tx.pipelineStage.delete({ where: { id } });
      }
    });

    await this.auditService.create({
      action: 'DELETE',
      entity: 'PipelineStage',
      entityId: id,
      description:
        `Étape "${stage.name}" retirée du pipeline (${traversed ? 'archivée' : 'supprimée'})` +
        (destination
          ? ` — ${dealsOnStage} opportunité(s) déplacée(s) vers "${destination.name}"`
          : ''),
      userId,
    });

    return {
      id,
      name: stage.name,
      archived: traversed,
      movedDeals: dealsOnStage,
      destinationStageId: destination?.id ?? null,
    };
  }

  /** Étape par défaut pour un nouveau deal (la première dans l'ordre). */
  async getDefaultStage() {
    const stage = await this.prisma.pipelineStage.findFirst({
      where: this.active,
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });

    if (!stage) {
      throw new BadRequestException(
        "Aucune étape de pipeline n'est configurée. Contactez un Super Admin.",
      );
    }

    return stage;
  }

  // --- Garde-fous ---------------------------------------------------------

  private async assertNameIsFree(name: string) {
    const existing = await this.prisma.pipelineStage.findUnique({
      where: { name },
    });

    if (existing) {
      throw new ConflictException(
        existing.isArchived
          ? `Le nom "${name}" est occupé par une étape archivée. Choisissez un autre libellé.`
          : `Une étape nommée "${name}" existe déjà.`,
      );
    }
  }

  /**
   * `next` vaut le nouveau rattachement de l'étape, ou `null` si elle quitte
   * le pipeline. Refuse l'opération si elle laisserait le pipeline sans
   * aucune étape de vente.
   */
  private async assertWinningStageSurvives(
    stage: { id: string; name: string; canonicalStage: CanonicalStage },
    next: CanonicalStage | null,
  ) {
    if (
      stage.canonicalStage !== CanonicalStage.VENTE ||
      next === CanonicalStage.VENTE
    ) {
      return;
    }

    const otherWinning = await this.prisma.pipelineStage.count({
      where: {
        ...this.active,
        canonicalStage: CanonicalStage.VENTE,
        id: { not: stage.id },
      },
    });

    if (otherWinning === 0) {
      throw new BadRequestException(
        `"${stage.name}" est la seule étape de vente du pipeline. Rattachez d'abord une autre étape à VENTE : sans elle, aucune affaire ne peut plus être gagnée.`,
      );
    }
  }

  private async nextOrder() {
    const last = await this.prisma.pipelineStage.findFirst({
      where: this.active,
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    return (last?.order ?? 0) + 1;
  }

  /**
   * `name` reste unique en base. Archiver « Closing » sans le renommer
   * interdirait de recréer une colonne « Closing », ce qui n'aurait aucun
   * sens pour l'administrateur.
   */
  private async archivedName(tx: Prisma.TransactionClient, name: string) {
    const base = `${name} (archivée)`;

    for (let suffix = 0; suffix < 50; suffix += 1) {
      const candidate = suffix === 0 ? base : `${base} ${suffix + 1}`;
      const taken = await tx.pipelineStage.findUnique({
        where: { name: candidate },
      });

      if (!taken) {
        return candidate;
      }
    }

    return `${base} ${Date.now()}`;
  }

  private describeChanges(
    before: Record<string, unknown>,
    after: Record<string, unknown>,
  ): string {
    const watched = [
      'name',
      'canonicalStage',
      'color',
      'isClosedWon',
      'isClosedLost',
      'requiresSignedOrder',
    ];

    const changes = watched
      .filter((key) => before[key] !== after[key])
      .map((key) => `${key} : ${String(before[key])} → ${String(after[key])}`);

    return changes.length > 0
      ? `Étape "${String(before.name)}" modifiée — ${changes.join(', ')}`
      : `Étape "${String(before.name)}" enregistrée sans changement`;
  }
}
