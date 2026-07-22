import { SetMetadata } from '@nestjs/common';
import { ProfileType } from 'prisma/src/generated/prisma/enums';

export const ROLES_KEY = 'ROLES_KEY';

export const Roles = (...roles: ProfileType[]) => SetMetadata(ROLES_KEY, roles);
