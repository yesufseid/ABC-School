import { ProfileType } from 'prisma/src/generated/prisma/enums';

export type TokenPayload = {
  phoneNumber: string;
  type: ProfileType;
  tenantId: string;
};
