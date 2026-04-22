import { SetMetadata } from '@nestjs/common';
import { RoleName } from '@prisma/client';

export const ROLES_KEY = 'roles';

// Route seviyesinde role metadata tanimlar
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);
