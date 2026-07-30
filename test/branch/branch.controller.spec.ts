import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '../../prisma/src/generated/prisma/client';
import { TestRequest } from '../helpers/request';
import { createTestApp, closeTestApp } from '../setup/app';
import { truncateTables } from '../setup/database';
import { seedAndLogin } from '../helpers/seed';
import { buildCreateTenantDto, buildCreateBranchDto } from '../factories';
import { ProfileType } from '../../prisma/src/generated/prisma/enums';

describe('BranchController (integration)', () => {
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

  async function createTenant(
    token: string,
    ownerPhone: string,
  ): Promise<string> {
    const response = await http
      .post('/api/v1/tenant')
      .set('Authorization', `Bearer ${token}`)
      .send(buildCreateTenantDto({ ownerPhone }))
      .expect(201);

    return response.body.tenantId;
  }

  describe('POST /api/v1/tenant/:tenantId/branches', () => {
    it('should return 201 when admin creates a branch', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);
      const tenantId = await createTenant(token, '+251988000001');
      const dto = buildCreateBranchDto();

      const response = await http
        .post(`/api/v1/tenant/${tenantId}/branches`)
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(dto.name);
      expect(response.body.branchCode).toBe(dto.branchCode);
      expect(response.body.branchPrefix).toBe(dto.branchPrefix);
    });

    it('should return 403 when owner tries to create a branch', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Owner);

      await http
        .post(`/api/v1/tenant/some-tenant-id/branches`)
        .set('Authorization', `Bearer ${token}`)
        .send(buildCreateBranchDto())
        .expect(403);
    });

    it('should return 401 when no token is provided', async () => {
      await http
        .post('/api/v1/tenant/some-tenant-id/branches')
        .send(buildCreateBranchDto())
        .expect(401);
    });

    it('should return 404 when tenant does not exist', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);

      await http
        .post('/api/v1/tenant/00000000-0000-0000-0000-000000000000/branches')
        .set('Authorization', `Bearer ${token}`)
        .send(buildCreateBranchDto())
        .expect(404);
    });

    it('should return 409 when branch prefix already exists globally', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);
      const tenantId = await createTenant(token, '+251988000002');

      await http
        .post(`/api/v1/tenant/${tenantId}/branches`)
        .set('Authorization', `Bearer ${token}`)
        .send(buildCreateBranchDto({ branchPrefix: 'UNIQUE' }))
        .expect(201);

      const tenantId2 = await createTenant(token, '+251988000003');

      await http
        .post(`/api/v1/tenant/${tenantId2}/branches`)
        .set('Authorization', `Bearer ${token}`)
        .send(buildCreateBranchDto({ branchPrefix: 'UNIQUE' }))
        .expect(409);
    });

    it('should return 409 when branch code already exists for the same tenant', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);
      const tenantId = await createTenant(token, '+251988000004');

      await http
        .post(`/api/v1/tenant/${tenantId}/branches`)
        .set('Authorization', `Bearer ${token}`)
        .send(buildCreateBranchDto({ branchCode: 'DUP-CODE' }))
        .expect(201);

      await http
        .post(`/api/v1/tenant/${tenantId}/branches`)
        .set('Authorization', `Bearer ${token}`)
        .send(buildCreateBranchDto({ branchCode: 'DUP-CODE' }))
        .expect(409);
    });

    it('should allow same branch code for different tenants', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);
      const tenantId1 = await createTenant(token, '+251988000005');
      const tenantId2 = await createTenant(token, '+251988000006');

      await http
        .post(`/api/v1/tenant/${tenantId1}/branches`)
        .set('Authorization', `Bearer ${token}`)
        .send(buildCreateBranchDto({ branchCode: 'SHARED-CODE' }))
        .expect(201);

      await http
        .post(`/api/v1/tenant/${tenantId2}/branches`)
        .set('Authorization', `Bearer ${token}`)
        .send(buildCreateBranchDto({ branchCode: 'SHARED-CODE' }))
        .expect(201);
    });

    it('should return 400 for invalid DTO', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);
      const tenantId = await createTenant(token, '+251988000007');

      await http
        .post(`/api/v1/tenant/${tenantId}/branches`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '', branchCode: '' })
        .expect(400);
    });
  });

  describe('GET /api/v1/tenant/:tenantId/branches', () => {
    it('should return 200 with branches list for admin', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);
      const tenantId = await createTenant(token, '+251988000010');

      await http
        .post(`/api/v1/tenant/${tenantId}/branches`)
        .set('Authorization', `Bearer ${token}`)
        .send(buildCreateBranchDto())
        .expect(201);

      const response = await http
        .get(`/api/v1/tenant/${tenantId}/branches`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1);
    });

    it('should return empty list for tenant with no branches', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);
      const tenantId = await createTenant(token, '+251988000011');

      const response = await http
        .get(`/api/v1/tenant/${tenantId}/branches`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data).toEqual([]);
    });

    it('should return 404 when tenant does not exist', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);

      await http
        .get('/api/v1/tenant/00000000-0000-0000-0000-000000000000/branches')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('GET /api/v1/tenant/:tenantId/branches/:id', () => {
    it('should return 200 with branch details', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);
      const tenantId = await createTenant(token, '+251988000012');

      const createResponse = await http
        .post(`/api/v1/tenant/${tenantId}/branches`)
        .set('Authorization', `Bearer ${token}`)
        .send(buildCreateBranchDto({ name: 'Detail Branch' }))
        .expect(201);

      const branchId = createResponse.body.id;

      const response = await http
        .get(`/api/v1/tenant/${tenantId}/branches/${branchId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('id', branchId);
      expect(response.body.data).toHaveProperty('name', 'Detail Branch');
    });

    it('should return 404 for non-existent branch', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);
      const tenantId = await createTenant(token, '+251988000013');

      await http
        .get(
          `/api/v1/tenant/${tenantId}/branches/00000000-0000-0000-0000-000000000000`,
        )
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('should return 404 when branch belongs to different tenant', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);
      const tenantId1 = await createTenant(token, '+251988000014');
      const tenantId2 = await createTenant(token, '+251988000015');

      const createResponse = await http
        .post(`/api/v1/tenant/${tenantId1}/branches`)
        .set('Authorization', `Bearer ${token}`)
        .send(buildCreateBranchDto())
        .expect(201);

      const branchId = createResponse.body.id;

      await http
        .get(`/api/v1/tenant/${tenantId2}/branches/${branchId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('PATCH /api/v1/tenant/:tenantId/branches/:id', () => {
    it('should return 200 when admin updates a branch', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);
      const tenantId = await createTenant(token, '+251988000016');

      const createResponse = await http
        .post(`/api/v1/tenant/${tenantId}/branches`)
        .set('Authorization', `Bearer ${token}`)
        .send(buildCreateBranchDto())
        .expect(201);

      const branchId = createResponse.body.id;

      const response = await http
        .patch(`/api/v1/tenant/${tenantId}/branches/${branchId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Branch Name' })
        .expect(200);

      expect(response.body.name).toBe('Updated Branch Name');
      expect(response.body.id).toBe(branchId);
    });

    it('should return 409 when updating branch prefix to an existing one', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);
      const tenantId = await createTenant(token, '+251988000017');

      await http
        .post(`/api/v1/tenant/${tenantId}/branches`)
        .set('Authorization', `Bearer ${token}`)
        .send(buildCreateBranchDto({ branchPrefix: 'TAKEN' }))
        .expect(201);

      const createResponse = await http
        .post(`/api/v1/tenant/${tenantId}/branches`)
        .set('Authorization', `Bearer ${token}`)
        .send(buildCreateBranchDto({ branchPrefix: 'OTHER' }))
        .expect(201);

      const branchId = createResponse.body.id;

      await http
        .patch(`/api/v1/tenant/${tenantId}/branches/${branchId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ branchPrefix: 'TAKEN' })
        .expect(409);
    });

    it('should return 409 when updating branch code to an existing one in same tenant', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);
      const tenantId = await createTenant(token, '+251988000018');

      await http
        .post(`/api/v1/tenant/${tenantId}/branches`)
        .set('Authorization', `Bearer ${token}`)
        .send(buildCreateBranchDto({ branchCode: 'EXISTING-CODE' }))
        .expect(201);

      const createResponse = await http
        .post(`/api/v1/tenant/${tenantId}/branches`)
        .set('Authorization', `Bearer ${token}`)
        .send(buildCreateBranchDto({ branchCode: 'OTHER-CODE' }))
        .expect(201);

      const branchId = createResponse.body.id;

      await http
        .patch(`/api/v1/tenant/${tenantId}/branches/${branchId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ branchCode: 'EXISTING-CODE' })
        .expect(409);
    });

    it('should allow keeping the same branch code when updating other fields', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);
      const tenantId = await createTenant(token, '+251988000019');

      const createResponse = await http
        .post(`/api/v1/tenant/${tenantId}/branches`)
        .set('Authorization', `Bearer ${token}`)
        .send(buildCreateBranchDto({ branchCode: 'KEEP-CODE' }))
        .expect(201);

      const branchId = createResponse.body.id;

      const response = await http
        .patch(`/api/v1/tenant/${tenantId}/branches/${branchId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Name', branchCode: 'KEEP-CODE' })
        .expect(200);

      expect(response.body.branchCode).toBe('KEEP-CODE');
      expect(response.body.name).toBe('New Name');
    });
  });

  describe('DELETE /api/v1/tenant/:tenantId/branches/:id', () => {
    it('should return 200 when admin deletes a branch', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);
      const tenantId = await createTenant(token, '+251988000020');

      const createResponse = await http
        .post(`/api/v1/tenant/${tenantId}/branches`)
        .set('Authorization', `Bearer ${token}`)
        .send(buildCreateBranchDto({ name: 'To Delete' }))
        .expect(201);

      const branchId = createResponse.body.id;

      const response = await http
        .delete(`/api/v1/tenant/${tenantId}/branches/${branchId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.message).toContain('deleted successfully');

      await http
        .get(`/api/v1/tenant/${tenantId}/branches/${branchId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('should return 404 when deleting non-existent branch', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);
      const tenantId = await createTenant(token, '+251988000021');

      await http
        .delete(
          `/api/v1/tenant/${tenantId}/branches/00000000-0000-0000-0000-000000000000`,
        )
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('should return 409 when branch has student grade records', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);
      const tenantId = await createTenant(token, '+251988000022');

      const createResponse = await http
        .post(`/api/v1/tenant/${tenantId}/branches`)
        .set('Authorization', `Bearer ${token}`)
        .send(buildCreateBranchDto({ name: 'Has Students' }))
        .expect(201);

      const branchId = createResponse.body.id;

      const stuProfile = await prisma.profile.create({
        data: {
          name: 'Student Profile',
          type: ProfileType.Student,
          userId: (
            await prisma.user.create({
              data: {
                phoneNumber: '+251988000099',
                password: 'hashed',
              },
            })
          ).id,
        },
      });
      const stu = await prisma.student.create({
        data: {
          firstName: 'Test',
          middleName: 'Student',
          lastName: 'Name',
          dateOfBirth: new Date('2015-01-01'),
          startingGrade: 1,
          studentId: 'STU-001',
          admissionDate: new Date('2024-09-01'),
          enrollmentDate: new Date('2024-09-01'),
                sex: 'Male',
          address: 'Addis Ababa',
          nationality: 'Ethiopian',
          password: 'hashed',
          profileId: stuProfile.id,
          tenantId,
        },
      });
      await prisma.studentGrade.create({
        data: {
          grade: 1,
          section: 'A',
          year: '2024',
          studentCode: 'STU-001',
          studentId: stu.id,
          branchId,
        },
      });

      await http
        .delete(`/api/v1/tenant/${tenantId}/branches/${branchId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(409);
    });
  });

  describe('Tenant creation with embedded branches', () => {
    it('should return 201 when creating tenant with branches', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);

      const response = await http
        .post('/api/v1/tenant')
        .set('Authorization', `Bearer ${token}`)
        .send(
          buildCreateTenantDto({
            ownerPhone: '+251988000030',
            branches: [
              buildCreateBranchDto({
                branchCode: 'MAIN-001',
                branchPrefix: 'MAIN',
                name: 'Main Branch',
              }),
              buildCreateBranchDto({
                branchCode: 'SUB-001',
                branchPrefix: 'SUB',
                name: 'Sub Branch',
              }),
            ],
          }),
        )
        .expect(201);

      expect(response.body).toHaveProperty('tenantId');
      expect(response.body.message).toBe('Registered School Successfully!');

      const branchesResponse = await http
        .get(`/api/v1/tenant/${response.body.tenantId}/branches`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(branchesResponse.body.data.length).toBe(2);
      expect(
        branchesResponse.body.data.map((b: { name: string }) => b.name),
      ).toContain('Main Branch');
      expect(
        branchesResponse.body.data.map((b: { name: string }) => b.name),
      ).toContain('Sub Branch');
    });

    it('should return 400 when creating tenant with duplicate branch prefix', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);

      await http
        .post('/api/v1/tenant')
        .set('Authorization', `Bearer ${token}`)
        .send(
          buildCreateTenantDto({
            ownerPhone: '+251988000031',
            branches: [
              buildCreateBranchDto({ branchPrefix: 'DUP' }),
              buildCreateBranchDto({ branchPrefix: 'DUP' }),
            ],
          }),
        )
        .expect(400);
    });

    it('should return 400 when creating tenant with duplicate branch codes', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);

      await http
        .post('/api/v1/tenant')
        .set('Authorization', `Bearer ${token}`)
        .send(
          buildCreateTenantDto({
            ownerPhone: '+251988000032',
            branches: [
              buildCreateBranchDto({ branchCode: 'DUP-CODE' }),
              buildCreateBranchDto({ branchCode: 'DUP-CODE' }),
            ],
          }),
        )
        .expect(400);
    });

    it('should return 409 when creating tenant with branch prefix that already exists', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);

      const firstResponse = await http
        .post('/api/v1/tenant')
        .set('Authorization', `Bearer ${token}`)
        .send(
          buildCreateTenantDto({
            ownerPhone: '+251988000033',
            branches: [buildCreateBranchDto({ branchPrefix: 'EXISTING' })],
          }),
        )
        .expect(201);

      expect(firstResponse.body).toHaveProperty('tenantId');

      await http
        .post('/api/v1/tenant')
        .set('Authorization', `Bearer ${token}`)
        .send(
          buildCreateTenantDto({
            ownerPhone: '+251988000034',
            branches: [buildCreateBranchDto({ branchPrefix: 'EXISTING' })],
          }),
        )
        .expect(409);
    });

    it('should create tenant without branches when branches array is omitted', async () => {
      const { token } = await seedAndLogin(prisma, app, ProfileType.Admin);

      const response = await http
        .post('/api/v1/tenant')
        .set('Authorization', `Bearer ${token}`)
        .send(buildCreateTenantDto({ ownerPhone: '+251988000035' }))
        .expect(201);

      expect(response.body).toHaveProperty('tenantId');

      const branchesResponse = await http
        .get(`/api/v1/tenant/${response.body.tenantId}/branches`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(branchesResponse.body.data).toEqual([]);
    });
  });
});
