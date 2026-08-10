import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Depuis D16 ce garde est global : il s'exécute aussi sur les routes
    // ouvertes, où `request.user` est absent.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!roles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    const user = request.user;

    // Sans rôle exploitable, on refuse. Ne jamais déréférencer `user.role`
    // sans garde-fou : une route protégée par un rôle mais atteinte sans
    // utilisateur doit rendre un 403, pas une erreur 500.
    if (!user?.role?.name) {
      return false;
    }

    return roles.includes(user.role.name);
  }
}
