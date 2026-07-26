import { exec } from 'child_process';
import { promisify } from 'util';
import { PrismaClient } from '../../prisma/src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const execAsync = promisify(exec);

export async function pushDatabase() {
  const { stdout, stderr } = await execAsync(
    'npx prisma db push --accept-data-loss',
  );
  if (stderr && !stderr.includes('Done in')) {
    console.log(stdout);
    console.error(stderr);
  }
}

export function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });

  return new PrismaClient({
    adapter,
    log: ['error', 'warn'],
  });
}

export async function truncateTables(prisma: PrismaClient) {
  const tables: { tablename: string }[] = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `;

  for (const { tablename } of tables) {
    if (tablename === '_prisma_migrations') continue;
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE`);
  }
}
