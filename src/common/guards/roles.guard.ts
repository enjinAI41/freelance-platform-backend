import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleName } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleName[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Bu route role zorunlu tutmuyorsa direkt izin verilir
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const user = req.user as { roles?: RoleName[] } | undefined;
    const roles = user?.roles ?? [];
    if (roles.length === 0) {
      return false;
    }

    // Kullanici rolleri ile route gereksinimi karsilastirilir
    return requiredRoles.some((role) => roles.includes(role));
  }
}
