import { PrismaClient } from '../../prisma/src/generated/prisma/client';

declare global {
  var __PRISMA__: PrismaClient | undefined;
}

jest.setTimeout(30000);
