import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '../../prisma/src/generated/prisma/client';
import { TestRequest } from '../helpers/request';
import { createTestApp, closeTestApp } from '../setup/app';
import { truncateTables } from '../setup/database';
import { seedTenantAndLogin } from '../helpers/seed';
import { buildCreateStaffDto } from '../factories';
import { ProfileType, Sex, Position } from '../../prisma/src/generated/prisma/enums';

describe('StaffController (integration)', () => {
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

  describe('POST /api/v1/staff', () => {
    it('should return 201 when owner creates a staff', async () => {
      const { token, branchId } = await seedTenantAndLogin(prisma, app, ProfileType.Owner);
      const dto = buildCreateStaffDto({ branchId });

      const response = await http
        .post('/api/v1/staff')
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(201);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('password');

      const staff = await prisma.staff.findUnique({
        where: { id: response.body.data.id },
        include: { profile: { include: { user: true } } },
      });

      expect(staff).not.toBeNull();
      expect(staff!.firstName).toBe(dto.firstName);
      expect(staff!.profile.user.phoneNumber).toBe(dto.phoneNumber);
    });

    it('should return 201 when registral creates a staff', async () => {
      const { token, branchId } = await seedTenantAndLogin(prisma, app, ProfileType.Registral);
      const dto = buildCreateStaffDto({ branchId });

      const response = await http
        .post('/api/v1/staff')
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('password');
    });

    it('should return 401 when no token is provided', async () => {
      const dto = buildCreateStaffDto();

      await http
        .post('/api/v1/staff')
        .send(dto)
        .expect(401);
    });

    it('should return 403 when user has Admin role', async () => {
      const { token, branchId } = await seedTenantAndLogin(prisma, app, ProfileType.Admin);
      const dto = buildCreateStaffDto({ branchId });

      await http
        .post('/api/v1/staff')
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(403);
    });

    it('should return 400 for missing required fields', async () => {
      const { token } = await seedTenantAndLogin(prisma, app, ProfileType.Owner);

      await http
        .post('/api/v1/staff')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);
    });

    it('should return 400 for invalid phone number', async () => {
      const { token, branchId } = await seedTenantAndLogin(prisma, app, ProfileType.Owner);
      const dto = buildCreateStaffDto({ branchId, phoneNumber: 'invalid' });

      await http
        .post('/api/v1/staff')
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(400);
    });

    it('should return 400 for invalid sex enum', async () => {
      const { token, branchId } = await seedTenantAndLogin(prisma, app, ProfileType.Owner);
      const dto = buildCreateStaffDto({ branchId, sex: 'Invalid' as Sex });

      await http
        .post('/api/v1/staff')
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(400);
    });

    it('should return 400 for invalid position enum', async () => {
      const { token, branchId } = await seedTenantAndLogin(prisma, app, ProfileType.Owner);
      const dto = buildCreateStaffDto({ branchId, position: 'Invalid' as Position });

      await http
        .post('/api/v1/staff')
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(400);
    });

    it('should return 404 when branch does not exist', async () => {
      const { token } = await seedTenantAndLogin(prisma, app, ProfileType.Owner);
      const dto = buildCreateStaffDto({ branchId: '00000000-0000-0000-0000-000000000000' });

      await http
        .post('/api/v1/staff')
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(404);
    });

    it('should return 409 when phone number already exists', async () => {
      const { token, branchId } = await seedTenantAndLogin(prisma, app, ProfileType.Owner);
      const sharedPhone = '+251911999999';
      const dto = buildCreateStaffDto({ branchId, phoneNumber: sharedPhone });

      await http
        .post('/api/v1/staff')
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(201);

      await http
        .post('/api/v1/staff')
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(409);
    });

    it('should return 409 when branch belongs to different tenant', async () => {
      const { token: token1, branchId: branchId1 } = await seedTenantAndLogin(
        prisma, app, ProfileType.Owner,
      );
      const { token: token2 } = await seedTenantAndLogin(
        prisma, app, ProfileType.Owner,
      );

      const dto = buildCreateStaffDto({ branchId: branchId1 });

      await http
        .post('/api/v1/staff')
        .set('Authorization', `Bearer ${token2}`)
        .send(dto)
        .expect(409);
    });
  });

  describe('GET /api/v1/staff', () => {
    it('should only return staff belonging to the current tenant', async () => {
      const tenantA = await seedTenantAndLogin(prisma, app, ProfileType.Owner);
      const dtoA1 = buildCreateStaffDto({ branchId: tenantA.branchId });
      const dtoA2 = buildCreateStaffDto({ branchId: tenantA.branchId });

      const resA1 = await http
        .post('/api/v1/staff')
        .set('Authorization', `Bearer ${tenantA.token}`)
        .send(dtoA1)
        .expect(201);
      const resA2 = await http
        .post('/api/v1/staff')
        .set('Authorization', `Bearer ${tenantA.token}`)
        .send(dtoA2)
        .expect(201);

      const tenantB = await seedTenantAndLogin(prisma, app, ProfileType.Owner);
      const dtoB1 = buildCreateStaffDto({ branchId: tenantB.branchId });

      const resB1 = await http
        .post('/api/v1/staff')
        .set('Authorization', `Bearer ${tenantB.token}`)
        .send(dtoB1)
        .expect(201);

      const responseA = await http
        .get('/api/v1/staff')
        .set('Authorization', `Bearer ${tenantA.token}`)
        .expect(200);

      expect(responseA.body.data).toHaveLength(2);
      expect(responseA.body.data.map((s: { id: string }) => s.id)).toEqual(
        expect.arrayContaining([resA1.body.data.id, resA2.body.data.id]),
      );

      const responseB = await http
        .get('/api/v1/staff')
        .set('Authorization', `Bearer ${tenantB.token}`)
        .expect(200);

      expect(responseB.body.data).toHaveLength(1);
      expect(responseB.body.data[0].id).toBe(resB1.body.data.id);
    });
  });

  describe('GET /api/v1/staff/:id', () => {
    it('should return staff when it belongs to the current tenant', async () => {
      const { token, branchId } = await seedTenantAndLogin(prisma, app, ProfileType.Owner);
      const dto = buildCreateStaffDto({ branchId });

      const createRes = await http
        .post('/api/v1/staff')
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(201);

      const staffId = createRes.body.data.id;

      const res = await http
        .get(`/api/v1/staff/${staffId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.id).toBe(staffId);
    });

    it('should return 404 when staff belongs to a different tenant', async () => {
      const { token: tokenA, branchId: branchIdA } = await seedTenantAndLogin(
        prisma, app, ProfileType.Owner,
      );
      const dto = buildCreateStaffDto({ branchId: branchIdA });

      const createRes = await http
        .post('/api/v1/staff')
        .set('Authorization', `Bearer ${tokenA}`)
        .send(dto)
        .expect(201);

      const staffId = createRes.body.data.id;

      const { token: tokenB } = await seedTenantAndLogin(
        prisma, app, ProfileType.Owner,
      );

      await http
        .get(`/api/v1/staff/${staffId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);
    });
  });
});