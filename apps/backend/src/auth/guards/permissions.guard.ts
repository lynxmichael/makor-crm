import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard
  implements CanActivate
{
  constructor(
    private reflector: Reflector,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean {
    const permissions =
      this.reflector.getAllAndOverride<string[]>(
        PERMISSIONS_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    if (!permissions) {
      return true;
    }

    const request =
      context.switchToHttp().getRequest();

    const user = request.user;

    const userPermissions =
      user.role.rolePermissions.map(
        (rp) => rp.permission.code,
      );

    return permissions.every((permission) =>
      userPermissions.includes(permission),
    );
  }
}