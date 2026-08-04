import { ForbiddenException, Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

/**
 * Qui peut créer et gérer quels comptes.
 *
 * Le Super Admin administre tout le monde. Le Superviseur encadre une équipe
 * commerciale : il peut donc créer et gérer ses commerciaux, mais rien
 * au-dessus — sans quoi il pourrait se hisser lui-même ou promouvoir un
 * collègue, ce qui viderait la hiérarchie de son sens.
 */
const MANAGEABLE_BY: Record<string, string[]> = {
  SUPER_ADMIN: ['SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL', 'MANAGER'],
  SUPERVISEUR: ['COMMERCIAL'],
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
        actorRole === 'SUPERVISEUR'
          ? 'Un superviseur ne peut créer ou gérer que des comptes commerciaux.'
          : 'Vous n’êtes pas autorisé à attribuer ce rôle.',
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
