import * as fs from 'node:fs';
import * as path from 'node:path';
import { loadEnvFile } from 'node:process';

const REQUIRED_KEYS = ['DATABASE_URL', 'JWT_SECRET'] as const;

export function loadTestEnv() {
  const envPath = path.resolve(process.cwd(), '.env.test');

  if (!fs.existsSync(envPath)) {
    throw new Error(
      '.env.test is required for integration tests. Please create it from .env.test.example',
    );
  }

  loadEnvFile(envPath);

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined in .env.test');
  }

  if (!process.env.DATABASE_URL.includes('_test')) {
    throw new Error(
      "DATABASE_URL does not contain '_test' - refusing to prevent accidental data loss",
    );
  }

  for (const key of REQUIRED_KEYS) {
    if (!process.env[key]) {
      throw new Error(`${key} is not defined in .env.test`);
    }
  }

  console.log('Test environment loaded from', envPath);
}
