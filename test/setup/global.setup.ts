import { loadTestEnv } from './env';
import { pushDatabase, createPrismaClient } from './database';

export default async function globalSetup() {
  loadTestEnv();
  await pushDatabase();

  const prisma = createPrismaClient();
  globalThis.__PRISMA__ = prisma;

  console.log('Global setup complete');
}
