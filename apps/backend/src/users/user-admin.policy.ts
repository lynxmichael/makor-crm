import { ForbiddenException, Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

/**
 * Qui peut créer et gérer quels comptes.
 *
 * Seul le Super Admin administre les comptes. Le Superviseur en a eu le droit
 * un temps (demande du 04/08), retiré le 07/08 : il encadre l'activité de ses
 * commerciaux, pas leurs accès.
 *
 * La table reste en place plutôt qu'être supprimée — rouvrir un périmètre se
 * fait en ajoutant une ligne, et les contrôles qui s'appuient dessus restent
 * valides quoi qu'il arrive.
 */
const MANAGEABLE_BY: Record<string, string[]> = {
  SUPER_ADMIN: ['SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL', 'MANAGER'],
};

@Injectable()
export class UserAdminPolicy {
  constructor(private readonly prisma: PrismaService) {}

  /** Rôles que cet administrateur a le droit d'attribuer. */
  assignableRoles(actorRole: string): string[] {
    return MANAGEABLE_BY[actorRole] ?? [];
  }

  /**
   * Vérifie qu'un administrateur peut agir sur un rôle donné.
   *
   * Contrôlé côté serveur et pas seulement dans le formulaire : un
   * superviseur qui appellerait l'API directement avec le rôle
   * `SUPER_ADMIN` obtiendrait autrement un compte d'administration.
   */
  assertCanAssign(actorRole: string, targetRoleName: string) {
    const allowed = this.assignableRoles(actorRole);

    if (!allowed.includes(targetRoleName)) {
      throw new ForbiddenException(
        'Seul le Super administrateur gère les comptes et leurs rôles.',
      );
    }
  }

  /** Même contrôle, à partir de l'identifiant du rôle plutôt que de son nom. */
  async assertCanAssignById(actorRole: string, roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: { name: true },
    });

    if (!role) {
      throw new ForbiddenException('Rôle inconnu.');
    }

    this.assertCanAssign(actorRole, role.name);
    return role.name;
  }

  /** Vérifie qu'un administrateur peut agir sur un compte existant. */
  async assertCanManage(actorRole: string, targetUserId: string) {
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { role: { select: { name: true } } },
    });

    if (!target) return;

    this.assertCanAssign(actorRole, target.role?.name ?? '');
  }
}
