import { PrismaClient } from '../../prisma/src/generated/prisma/client';
import * as argon2 from 'argon2';
import { TestRequest } from './request';
import { INestApplication } from '@nestjs/common';
import { ProfileType } from '../../prisma/src/generated/prisma/enums';

let phoneCounter = 1;

export interface SeedResult {
  token: string;
  user: { id: string; phoneNumber: string };
}

export async function seedAndLogin(
  prisma: PrismaClient,
  app: INestApplication,
  role: ProfileType = ProfileType.Admin,
): Promise<SeedResult> {
  const phoneNumber = `+251911${String(phoneCounter++).padStart(6, '0')}`;
  const password = 'TestPassword123!';
  const hashedPassword = await argon2.hash(password);

  const user = await prisma.user.create({
    data: {
      phoneNumber,
      password: hashedPassword,
      profile: {
        create: {
          name: `Test ${role} User`,
          type: role,
        },
      },
    },
  });

  const http = new TestRequest(app);
  const response = await http
    .post('/api/v1/auth/login')
    .send({ phoneNumber, password })
    .expect(201);

  return {
    token: response.body.data.accessToken,
    user: { id: user.id, phoneNumber },
  };
}
