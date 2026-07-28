import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '../../prisma/src/generated/prisma/client';
import { TestRequest } from '../helpers/request';
import { createTestApp, closeTestApp } from '../setup/app';
import { truncateTables } from '../setup/database';
import { seedAndLogin } from '../helpers/seed';
import { buildCreateTenantDto, buildSubscribeTenantDto } from '../factories';
import { ProfileType } from '../../prisma/src/generated/prisma/enums';

describe('TenantController (integration)', () => {
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

  describe('POST /api/v1/tenant', () => {
    it('should return 201 when admin creates a tenant', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);
      const dto = buildCreateTenantDto();

      const response = await http
        .post('/api/v1/tenant')
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(201);

      expect(response.body.message).toBe('Registered School Successfully!');
    });

    it('should return 403 when owner tries to create a tenant', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Owner);

      await http
        .post('/api/v1/tenant')
        .set('Authorization', `Bearer ${token}`)
        .send(buildCreateTenantDto())
        .expect(403);
    });

    it('should return 403 when staff tries to create a tenant', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Staff);

      await http
        .post('/api/v1/tenant')
        .set('Authorization', `Bearer ${token}`)
        .send(buildCreateTenantDto())
        .expect(403);
    });

    it('should return 401 when no token is provided', async () => {
      await http
        .post('/api/v1/tenant')
        .send(buildCreateTenantDto())
        .expect(401);
    });

    it('should return 409 when owner phone already exists', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);
      const dto = buildCreateTenantDto({
        ownerPhone: '+251988888888',
        branchCode: 'NEW',
        branchPrefix: 'NEW',
      });

      await http
        .post('/api/v1/tenant')
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(201);

      await http
        .post('/api/v1/tenant')
        .set('Authorization', `Bearer ${token}`)
        .send({
          ...dto,
          branchPrefix: 'NEW2',
        })
        .expect(409);
    });

    it('should return 409 when branch already prefix exists', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);
      const dto = buildCreateTenantDto({
        ownerPhone: '+251919283746',
        branchCode: 'DUPLICATE',
        branchPrefix: 'DUPLICATE',
      });

      await http
        .post('/api/v1/tenant')
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(201);

      await http
        .post('/api/v1/tenant')
        .set('Authorization', `Bearer ${token}`)
        .send({
          ...dto,
          ownerPhone: '+251991827364',
        })
        .expect(409);
    });

    it('should return 400 for invalid DTO', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);

      await http
        .post('/api/v1/tenant')
        .set('Authorization', `Bearer ${token}`)
        .send({ ownerPhone: 'invalid', password: 'short' })
        .expect(400);
    });
  });

  describe('GET /api/v1/tenant', () => {
    it('should return 200 with tenants list for admin', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);

      const response = await http
        .get('/api/v1/tenant')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/v1/tenant/:id', () => {
    it('should return 200 with tenant details', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);

      await http
        .post('/api/v1/tenant')
        .set('Authorization', `Bearer ${token}`)
        .send(buildCreateTenantDto({ ownerPhone: '+251977777777' }))
        .expect(201);

      const listResponse = await http
        .get('/api/v1/tenant')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const tenantId = listResponse.body.data[0].id;

      const response = await http
        .get(`/api/v1/tenant/${tenantId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('id', tenantId);
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('owner');
    });

    it('should return 404 for non-existent tenant', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);

      await http
        .get('/api/v1/tenant/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('PATCH /api/v1/tenant/:id', () => {
    it('should return 200 when admin updates a tenant', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);

      await http
        .post('/api/v1/tenant')
        .set('Authorization', `Bearer ${token}`)
        .send(buildCreateTenantDto({ ownerPhone: '+251966666666' }))
        .expect(201);

      const listResponse = await http
        .get('/api/v1/tenant')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const tenantId = listResponse.body.data[0].id;

      const response = await http
        .patch(`/api/v1/tenant/${tenantId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(
          buildCreateTenantDto({
            ownerPhone: '+251966666666',
            name: 'Updated School Name',
          }),
        )
        .expect(200);

      expect(response.body.message).toBe('Updated School Successfully!');
    });
  });

  describe('DELETE /api/v1/tenant/:id', () => {
    it('should return 200 when admin deletes a tenant', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);

      await http
        .post('/api/v1/tenant')
        .set('Authorization', `Bearer ${token}`)
        .send(buildCreateTenantDto({ ownerPhone: '+251955555555' }))
        .expect(201);

      const listResponse = await http
        .get('/api/v1/tenant')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const tenantId = listResponse.body.data[0].id;

      const response = await http
        .delete(`/api/v1/tenant/${tenantId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.message).toContain('Removed School');
    });
  });

  describe('POST /api/v1/tenant/subscribe', () => {
    it('should return 201 when admin subscribes a tenant', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);

      await http
        .post('/api/v1/subscription')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Plan',
          months: 6,
          price: 5000,
          features: { smsLimit: 1000 },
        })
        .expect(201);

      await http
        .post('/api/v1/tenant')
        .set('Authorization', `Bearer ${token}`)
        .send(buildCreateTenantDto({ ownerPhone: '+251944444444' }))
        .expect(201);

      const listResponse = await http
        .get('/api/v1/tenant')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const tenantId = listResponse.body.data[0].id;

      const planListResponse = await http
        .get('/api/v1/subscription')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const planId = planListResponse.body.data[0].id;

      const response = await http
        .post('/api/v1/tenant/subscribe')
        .set('Authorization', `Bearer ${token}`)
        .send(
          buildSubscribeTenantDto({
            tenantId,
            subscriptionId: planId,
            paidAmount: 5000,
          }),
        )
        .expect(201);

      expect(response.body.message).toBe('Subscribed Tenant Successfully!');
    });

    it('should return 404 when subscription plan does not exist', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);

      await http
        .post('/api/v1/tenant')
        .set('Authorization', `Bearer ${token}`)
        .send(buildCreateTenantDto({ ownerPhone: '+251933333333' }))
        .expect(201);

      const listResponse = await http
        .get('/api/v1/tenant')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const tenantId = listResponse.body.data[0].id;

      await http
        .post('/api/v1/tenant/subscribe')
        .set('Authorization', `Bearer ${token}`)
        .send(
          buildSubscribeTenantDto({
            tenantId,
            subscriptionId: '00000000-0000-0000-0000-000000000000',
          }),
        )
        .expect(404);
    });
  });

  describe('Authorization', () => {
    it('should return 401 when no token is provided for GET /tenant', async () => {
      await http.get('/api/v1/tenant').expect(401);
    });

    it('should return 403 when owner tries to list tenants', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Owner);

      await http
        .get('/api/v1/tenant')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });
});
