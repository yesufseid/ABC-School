import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '../../prisma/src/generated/prisma/client';
import * as argon2 from 'argon2';
import { TestRequest } from '../helpers/request';
import { createTestApp, closeTestApp } from '../setup/app';
import { truncateTables } from '../setup/database';
import { buildLoginDto } from '../factories';

describe('AuthController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let http: TestRequest;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = globalThis.__PRISMA__;
    http = new TestRequest(app);
  });

  afterAll(async () => {
    await closeTestApp();
  });

  beforeEach(async () => {
    await truncateTables(prisma);
  });

  describe('POST /api/v1/auth/login', () => {
    it('should return 200 with accessToken on valid credentials', async () => {
      const phoneNumber = '+251911111111';
      const password = 'SecurePass123!';
      const hashedPassword = await argon2.hash(password);

      await prisma.user.create({
        data: {
          phoneNumber,
          password: hashedPassword,
          profile: {
            create: {
              name: 'Test User',
              type: 'Admin',
            },
          },
        },
      });

      const response = await http
        .post('/api/v1/auth/login')
        .send(buildLoginDto({ phoneNumber, password }))
        .expect(201);

      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data.phoneNumber).toBe(phoneNumber);
      expect(response.body.data.name).toBe('Test User');
      expect(response.body.data.type).toBe('Admin');
    });

    it('should return 401 with wrong password', async () => {
      const phoneNumber = '+251922222222';
      const hashedPassword = await argon2.hash('CorrectPassword');

      await prisma.user.create({
        data: {
          phoneNumber,
          password: hashedPassword,
          profile: {
            create: { name: 'Wrong Pass User', type: 'Admin' },
          },
        },
      });

      const response = await http
        .post('/api/v1/auth/login')
        .send(buildLoginDto({ phoneNumber, password: 'WrongPassword' }))
        .expect(401);

      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should return 404 for non-existent phone number', async () => {
      const response = await http
        .post('/api/v1/auth/login')
        .send(buildLoginDto({ phoneNumber: '+251999999999', password: 'anything' }))
        .expect(404);

      expect(response.body.message).toBe('User not found');
    });

    it('should return 400 for invalid DTO', async () => {
      await http
        .post('/api/v1/auth/login')
        .send({ phoneNumber: 'not-a-phone', password: 'ab' })
        .expect(400);
    });
  });
});
