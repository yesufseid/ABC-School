import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '../../prisma/src/generated/prisma/client';
import { TestRequest } from '../helpers/request';
import { createTestApp, closeTestApp } from '../setup/app';
import { truncateTables } from '../setup/database';
import { seedAndLogin } from '../helpers/seed';
import { buildCreateSubscriptionDto } from '../factories';
import { ProfileType } from '../../prisma/src/generated/prisma/enums';

describe('SubscriptionController (integration)', () => {
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

  describe('POST /api/v1/subscription', () => {
    it('should return 201 when admin creates a subscription', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);
      const dto = buildCreateSubscriptionDto();

      const response = await http
        .post('/api/v1/subscription')
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(201);

      expect(response.body.message).toBe('Subscription created successfully');
    });

    it('should return 409 when subscription name already exists', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);
      const dto = buildCreateSubscriptionDto({ name: 'Unique Plan' });

      await http
        .post('/api/v1/subscription')
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(201);

      await http
        .post('/api/v1/subscription')
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(409);
    });

    it('should return 400 for invalid DTO', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);

      await http
        .post('/api/v1/subscription')
        .set('Authorization', `Bearer ${token}`)
        .send({ months: 1, price: 100 })
        .expect(400);
    });

    it('should return 401 when no token is provided', async () => {
      await http
        .post('/api/v1/subscription')
        .send(buildCreateSubscriptionDto())
        .expect(401);
    });

    it('should return 403 when owner tries to create a subscription', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Owner);

      await http
        .post('/api/v1/subscription')
        .set('Authorization', `Bearer ${token}`)
        .send(buildCreateSubscriptionDto())
        .expect(403);
    });
  });

  describe('GET /api/v1/subscription', () => {
    it('should return 200 with subscriptions list for admin', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);

      const response = await http
        .get('/api/v1/subscription')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/v1/subscription/:id', () => {
    it('should return 200 with subscription details', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);

      await http
        .post('/api/v1/subscription')
        .set('Authorization', `Bearer ${token}`)
        .send(buildCreateSubscriptionDto({ name: 'Detail Plan' }))
        .expect(201);

      const listResponse = await http
        .get('/api/v1/subscription')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const subId = listResponse.body.data[0].id;

      const response = await http
        .get(`/api/v1/subscription/${subId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('id', subId);
      expect(response.body.data).toHaveProperty('name', 'Detail Plan');
    });

    it('should return 404 for non-existent subscription', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);

      await http
        .get('/api/v1/subscription/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('PATCH /api/v1/subscription/:id', () => {
    it('should return 200 when admin updates a subscription', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);

      await http
        .post('/api/v1/subscription')
        .set('Authorization', `Bearer ${token}`)
        .send(buildCreateSubscriptionDto({ name: 'Update Plan' }))
        .expect(201);

      const listResponse = await http
        .get('/api/v1/subscription')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const subId = listResponse.body.data[0].id;

      const response = await http
        .patch(`/api/v1/subscription/${subId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Plan', months: 12 })
        .expect(200);

      expect(response.body.message).toBe('Subscription updated successfully');
    });
  });

  describe('DELETE /api/v1/subscription/:id', () => {
    it('should return 200 when admin deletes a subscription', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);

      await http
        .post('/api/v1/subscription')
        .set('Authorization', `Bearer ${token}`)
        .send(buildCreateSubscriptionDto({ name: 'Delete Plan' }))
        .expect(201);

      const listResponse = await http
        .get('/api/v1/subscription')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const subId = listResponse.body.data[0].id;

      const response = await http
        .delete(`/api/v1/subscription/${subId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.message).toBe('Subscription removed successfully');
    });

    it('should return 404 when deleting non-existent subscription', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);

      await http
        .delete('/api/v1/subscription/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });
});
