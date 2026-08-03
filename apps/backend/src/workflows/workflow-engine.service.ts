import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import {
  ActivityType,
  CommentEntity,
  NotificationType,
  Prisma,
  WorkflowActionType,
  WorkflowRunStatus,
  WorkflowTrigger,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';

/** Une condition telle que stockée dans `Workflow.conditions`. */
interface Condition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in' | 'isEmpty' | 'isSet';
  value?: unknown;
}

export interface WorkflowEvent {
  trigger: WorkflowTrigger;
  entityType: string;
  entityId: string;
  /** Instantané de l'entité, sur lequel portent conditions et gabarits. */
  payload: Record<string, unknown>;
  /** Auteur de l'action déclenchante, quand il y en a un. */
  actorId?: string;
}

@Injectable()
export class WorkflowEngineService {
  private readonly logger = new Logger(WorkflowEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Point d'entrée unique.
   *
   * Écouter un événement générique plutôt qu'un par déclencheur permet
   * d'ajouter un point d'accroche dans le code métier sans toucher au
   * moteur : il suffit d'émettre `workflow.trigger` avec le bon enum.
   */
  @OnEvent('workflow.trigger')
  async handle(event: WorkflowEvent): Promise<void> {
    const workflows = await this.prisma.workflow.findMany({
      where: { trigger: event.trigger, isActive: true },
      include: { actions: { orderBy: { position: 'asc' } } },
    });

    for (const workflow of workflows) {
      // Exécutions séquentielles et sans await bloquant l'appelant : une
      // règle lente ne doit pas ralentir l'enregistrement d'un devis.
      void this.run(workflow, event).catch((error) =>
        this.logger.error(`Règle « ${workflow.name} » en échec : ${String(error)}`),
      );
    }
  }

  private async run(
    workflow: Prisma.WorkflowGetPayload<{ include: { actions: true } }>,
    event: WorkflowEvent,
  ) {
    const startedAt = Date.now();

    // Garde-fou de volume : une règle emballée — condition trop large,
    // boucle involontaire — pourrait noyer les utilisateurs de
    // notifications avant que quiconque s'en aperçoive.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const runsToday = await this.prisma.workflowRun.count({
      where: { workflowId: workflow.id, createdAt: { gte: since } },
    });

    if (runsToday >= workflow.maxRunsPerDay) {
      await this.record(workflow.id, event, WorkflowRunStatus.SKIPPED, {}, 0, 'Plafond journalier atteint');
      return;
    }

    const conditions = (workflow.conditions as unknown as Condition[]) ?? [];
    const unmet = conditions.find((condition) => !this.matches(condition, event.payload));

    if (unmet) {
      await this.record(
        workflow.id,
        event,
        WorkflowRunStatus.SKIPPED,
        {},
        Date.now() - startedAt,
        `Condition non remplie : ${unmet.field} ${unmet.operator}`,
      );
      return;
    }

    const result: Record<string, string> = {};
    let failures = 0;

    for (const action of workflow.actions) {
      try {
        await this.execute(action.type, action.config as Record<string, unknown>, event);
        result[action.id] = 'ok';
      } catch (error) {
        failures += 1;
        result[action.id] = `échec : ${String(error)}`;
      }
    }

    const status =
      failures === 0
        ? WorkflowRunStatus.SUCCESS
        : failures === workflow.actions.length
          ? WorkflowRunStatus.FAILED
          : WorkflowRunStatus.PARTIAL;

    await this.record(workflow.id, event, status, result, Date.now() - startedAt);
  }

  // -------------------------------------------------------------------------
  // Conditions
  // -------------------------------------------------------------------------

  /** Lit un champ, y compris imbriqué : « customer.country ». */
  private read(payload: Record<string, unknown>, path: string): unknown {
    return path
      .split('.')
      .reduce<unknown>((acc, part) => (acc as Record<string, unknown> | undefined)?.[part], payload);
  }

  private matches(condition: Condition, payload: Record<string, unknown>): boolean {
    const actual = this.read(payload, condition.field);
    const expected = condition.value;

    switch (condition.operator) {
      case 'eq':
        return String(actual) === String(expected);
      case 'ne':
        return String(actual) !== String(expected);
      case 'gt':
        return Number(actual) > Number(expected);
      case 'gte':
        return Number(actual) >= Number(expected);
      case 'lt':
        return Number(actual) < Number(expected);
      case 'lte':
        return Number(actual) <= Number(expected);
      case 'contains':
        return String(actual ?? '')
          .toLowerCase()
          .includes(String(expected ?? '').toLowerCase());
      case 'in':
        return Array.isArray(expected) && expected.map(String).includes(String(actual));
      case 'isEmpty':
        return actual === null || actual === undefined || actual === '';
      case 'isSet':
        return actual !== null && actual !== undefined && actual !== '';
      default:
        // Un opérateur inconnu ne doit pas rendre la règle « toujours vraie » :
        // dans le doute, on ne déclenche pas.
        return false;
    }
  }

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  /**
   * Remplace les variables `{{champ}}` par les valeurs de l'événement.
   * Une variable absente est laissée telle quelle plutôt que remplacée par
   * « undefined » — cela rend le gabarit fautif visible dans le message.
   */
  private interpolate(template: string, payload: Record<string, unknown>): string {
    return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (whole, path: string) => {
      const value = this.read(payload, path);
      return value === undefined || value === null ? whole : String(value);
    });
  }

  private async execute(
    type: WorkflowActionType,
    config: Record<string, unknown>,
    event: WorkflowEvent,
  ): Promise<void> {
    const title = this.interpolate(String(config.title ?? 'Notification'), event.payload);
    const message = this.interpolate(String(config.message ?? ''), event.payload);

    switch (type) {
      case WorkflowActionType.NOTIFY_USER: {
        // « owner » désigne le propriétaire de l'entité : c'est le cas le
        // plus courant, et il évite de figer un identifiant dans la règle.
        const userId =
          config.userId === 'owner'
            ? (event.payload.assignedToId as string) ?? event.actorId
            : (config.userId as string);

        if (!userId) throw new Error('Destinataire introuvable');

        await this.notifications.create({
          userId,
          title,
          message,
          type: NotificationType.INFO,
        });
        return;
      }

      case WorkflowActionType.NOTIFY_ROLE: {
        const users = await this.prisma.user.findMany({
          where: { isActive: true, role: { name: String(config.roleName ?? '') } },
          select: { id: true },
        });

        await Promise.all(
          users.map((user) =>
            this.notifications.create({
              userId: user.id,
              title,
              message,
              type: NotificationType.INFO,
            }),
          ),
        );
        return;
      }

      case WorkflowActionType.SEND_EMAIL: {
        const to = this.interpolate(String(config.to ?? ''), event.payload);
        if (!to.includes('@')) throw new Error('Adresse destinataire invalide');

        await this.mail.sendMail(to, title, `<p>${message.replace(/\n/g, '<br>')}</p>`);
        return;
      }

      case WorkflowActionType.CREATE_ACTIVITY: {
        const assignedToId =
          (event.payload.assignedToId as string) ?? (config.assignedToId as string) ?? event.actorId;

        if (!assignedToId) throw new Error('Aucun responsable pour cette activité');

        const dueInDays = Number(config.dueInDays ?? 1);

        await this.prisma.activity.create({
          data: {
            title,
            description: message || null,
            type: (config.activityType as ActivityType) ?? ActivityType.TASK,
            dueDate: new Date(Date.now() + dueInDays * 24 * 60 * 60 * 1000),
            assignedToId,
            customerId: (event.payload.customerId as string) ?? null,
          },
        });
        return;
      }

      case WorkflowActionType.POST_COMMENT: {
        const authorId = event.actorId;
        if (!authorId) throw new Error('Aucun auteur pour ce commentaire');

        await this.prisma.comment.create({
          data: {
            body: message || title,
            entityType: event.entityType as CommentEntity,
            entityId: event.entityId,
            authorId,
          },
        });
        return;
      }

      case WorkflowActionType.ASSIGN_OWNER: {
        const userId = String(config.userId ?? '');
        if (!userId) throw new Error('Aucun destinataire d’affectation');

        // Limité aux entités qui portent un responsable ; les autres sont
        // refusées explicitement plutôt qu'ignorées en silence.
        if (event.entityType === 'CUSTOMER') {
          await this.prisma.customer.update({
            where: { id: event.entityId },
            data: { assignedToId: userId },
          });
          return;
        }

        if (event.entityType === 'DEAL') {
          await this.prisma.deal.update({
            where: { id: event.entityId },
            data: { assignedToId: userId },
          });
          return;
        }

        throw new Error(`Affectation non prise en charge pour ${event.entityType}`);
      }

      case WorkflowActionType.CALL_WEBHOOK: {
        const url = String(config.url ?? '');
        if (!url.startsWith('https://')) {
          throw new Error('Seules les URL en HTTPS sont acceptées');
        }

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            trigger: event.trigger,
            entityType: event.entityType,
            entityId: event.entityId,
            payload: event.payload,
          }),
        });

        if (!response.ok) throw new Error(`Réponse ${response.status}`);
        return;
      }

      case WorkflowActionType.UPDATE_FIELD:
        // Modifier un champ arbitraire depuis une règle contournerait les
        // validations métier des services. Le besoin réel est couvert par
        // ASSIGN_OWNER ; le reste attend un cas d'usage précis.
        throw new Error(
          'La modification de champ arbitraire n’est pas activée : elle contournerait les règles de validation.',
        );

      default:
        throw new Error(`Action non prise en charge : ${type}`);
    }
  }

  private record(
    workflowId: string,
    event: WorkflowEvent,
    status: WorkflowRunStatus,
    result: Record<string, string>,
    durationMs: number,
    skipReason?: string,
  ) {
    return this.prisma.workflowRun
      .create({
        data: {
          workflowId,
          entityType: event.entityType,
          entityId: event.entityId,
          status,
          result,
          durationMs,
          skipReason: skipReason ?? null,
        },
      })
      .catch(() => undefined);
  }
}
