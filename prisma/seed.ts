import { PrismaClient } from './src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { loadEnvFile } from 'process';

async function main() {
  loadEnvFile();

  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  const prisma = new PrismaClient({ adapter });

  const seedUsers = [
    { phone: '+251911111111', name: 'Super Admin', type: 'Admin' },
    { phone: '+251922222222', name: 'Owner One', type: 'Owner' },
  ];

  for (const user of seedUsers) {
    const existing = await prisma.user.findUnique({
      where: { phoneNumber: user.phone },
    });

    if (existing) {
      console.log(`User ${user.phone} already exists`);
      continue;
    }

    const hashedPassword = await argon2.hash('password123');

    const created = await prisma.user.create({
      data: {
        phoneNumber: user.phone,
        password: hashedPassword,
        profile: {
          create: {
            name: user.name,
            type: user.type === 'Admin' ? 'Admin' : 'Owner',
          },
        },
      },
    });

    console.log(
      `Created: ${created.phoneNumber} / password123${user.type ? ` (${user.type})` : ''}`,
    );
  }

  await prisma.$disconnect();
}

main();
