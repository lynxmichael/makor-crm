declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      phone: string | null;
      firstName: string;
      lastName: string;
      password: string;
      avatar: string | null;
      jobTitle: string | null;
      isActive: boolean;
      failedLoginAttempts: number;
      lockedUntil: Date | null;
      lastLogin: Date | null;
      twoFactorEnabled: boolean;
      twoFactorSecret: string | null;
      twoFactorRecoveryCodes: string[];
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
