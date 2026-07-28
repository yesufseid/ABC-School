import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function globalTeardown() {
  if (globalThis.__PRISMA__) {
    await globalThis.__PRISMA__.$disconnect();
  }

  try {
    await execAsync('npx prisma db push --force-reset --accept-data-loss');
    console.log('Test database reset');
  } catch (error) {
    console.error('Failed to reset test database:', error);
  }
}
