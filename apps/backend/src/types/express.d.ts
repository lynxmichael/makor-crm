/**
 * Utilisateur attaché à la requête par `JwtStrategy.validate`, qui passe par
 * `UsersService.findById`.
 *
 * `password`, `twoFactorSecret` et `twoFactorRecoveryCodes` n'y figurent pas :
 * l'`omit` global du client Prisma les retire de toute lecture, et seuls les
 * parcours d'authentification les rétablissent explicitement. Les déclarer ici
 * ferait croire qu'un contrôleur peut les lire sur `req.user`.
 */
declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      phone: string | null;
      firstName: string;
      lastName: string;
      avatar: string | null;
      jobTitle: string | null;
      isActive: boolean;
      failedLoginAttempts: number;
      lockedUntil: Date | null;
      lastLogin: Date | null;
      twoFactorEnabled: boolean;
      companyId: string | null;
      departmentId: string | null;
      roleId: string;
      createdAt: Date;
      updatedAt: Date;
      department: {
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
      } | null;
      role: {
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        rolePermissions: {
          id: string;
          roleId: string;
          permissionId: string;
          createdAt: Date;
          permission: {
            id: string;
            code: string;
            label: string;
            module: string;
            createdAt: Date;
            updatedAt: Date;
          };
        }[];
      };
    }
  }
}

export {};
