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

export interface TenantSeedResult {
  token: string;
  user: { id: string; phoneNumber: string };
  tenantId: string;
  branchId: string;
}

export async function seedTenantAndLogin(
  prisma: PrismaClient,
  app: INestApplication,
  role: ProfileType = ProfileType.Owner,
): Promise<TenantSeedResult> {
  const phoneNumber = `+251988${String(phoneCounter++).padStart(6, '0')}`;
  const loginPassword = 'TestPassword123!';
  const hashedPassword = await argon2.hash(loginPassword);

  const tenant = await prisma.tenant.create({
    data: {
      name: `Test School ${phoneCounter}`,
      description: `Test school for staff tests ${phoneCounter}`,
      details: {},
    },
  });

  const branch = await prisma.branch.create({
    data: {
      name: 'Test Branch',
      description: 'Branch for staff tests',
      branchCode: `TST-${String(phoneCounter).padStart(3, '0')}`,
      branchPrefix: `TST${phoneCounter}`,
      details: {},
      tenantId: tenant.id,
    },
  });

  const subscription = await prisma.subscription.upsert({
    where: { name: 'Test Plan' },
    update: {},
    create: {
      name: 'Test Plan',
      months: 12,
      price: 0,
      active: true,
      features: {},
    },
  });

  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 1);

  await prisma.tenantSubscription.create({
    data: {
      tenantId: tenant.id,
      subscriptionId: subscription.id,
      startDate: new Date(),
      endDate,
      paidAmount: 0,
    },
  });

  const user = await prisma.user.create({
    data: {
      phoneNumber,
      password: hashedPassword,
      profile: {
        create: {
          name: `Test ${role} User`,
          type: role,
          tenantId: tenant.id,
        },
      },
    },
  });

  const http = new TestRequest(app);
  const response = await http
    .post('/api/v1/auth/login')
    .send({ phoneNumber, password: loginPassword })
    .expect(201);

  return {
    token: response.body.data.accessToken,
    user: { id: user.id, phoneNumber },
    tenantId: tenant.id,
    branchId: branch.id,
  };
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
