import request from 'supertest';
import { app } from '../app';
import { prisma } from '../config/prisma';
import { getTestToken, setupTestDB, teardownTestDB } from './testUtils';

beforeAll(async () => {
  await setupTestDB();
});

afterAll(async () => {
  await teardownTestDB();
  await prisma.$disconnect();
});

describe('Authorization & RBAC Middleware', () => {
  const ceoToken = getTestToken('TEST_CEO', 'CEO');
  const accountToken = getTestToken('TEST_ACCOUNT', 'Account');

  it('API-AUTH-01: Allows access based on default RolePermission (Granted)', async () => {
    // CEO has 'system:grant_permission' by default
    const res = await request(app)
      .get('/api/permissions/matrix')
      .set('Authorization', `Bearer ${ceoToken}`);
    
    expect(res.status).toBe(200);
  });

  it('API-AUTH-02: Denies access based on default RolePermission (Revoked)', async () => {
    // Account does NOT have 'system:grant_permission' by default
    const res = await request(app)
      .get('/api/permissions/matrix')
      .set('Authorization', `Bearer ${accountToken}`);
    
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Forbidden: Missing permission');
  });

  it('API-AUTH-03: Allows access when StaffPermission explicitly Grants, overriding Revoked Role', async () => {
    // Explicitly grant to Account
    await prisma.staffPermission.upsert({
      where: { staffId_permissionCode: { staffId: 'TEST_ACCOUNT', permissionCode: 'system:grant_permission' } },
      update: { isGranted: true },
      create: { staffId: 'TEST_ACCOUNT', permissionCode: 'system:grant_permission', isGranted: true }
    });

    const res = await request(app)
      .get('/api/permissions/matrix')
      .set('Authorization', `Bearer ${accountToken}`);
    
    expect(res.status).toBe(200);
  });

  it('API-AUTH-04: Denies access when StaffPermission explicitly Revokes, overriding Granted Role', async () => {
    // Explicitly revoke for CEO
    await prisma.staffPermission.upsert({
      where: { staffId_permissionCode: { staffId: 'TEST_CEO', permissionCode: 'system:grant_permission' } },
      update: { isGranted: false },
      create: { staffId: 'TEST_CEO', permissionCode: 'system:grant_permission', isGranted: false }
    });

    const res = await request(app)
      .get('/api/permissions/matrix')
      .set('Authorization', `Bearer ${ceoToken}`);
    
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('explicitly revoked');
  });

  it('API-AUTH-05: Reverts StaffPermission override back to default behavior', async () => {
    // Delete explicit revoke for CEO
    await prisma.staffPermission.delete({
      where: { staffId_permissionCode: { staffId: 'TEST_CEO', permissionCode: 'system:grant_permission' } }
    });

    const res = await request(app)
      .get('/api/permissions/matrix')
      .set('Authorization', `Bearer ${ceoToken}`);
    
    expect(res.status).toBe(200); // Back to default Granted
  });

  it('API-AUTH-06: /api/permissions/matrix returns valid format', async () => {
    const res = await request(app)
      .get('/api/permissions/matrix')
      .set('Authorization', `Bearer ${ceoToken}`);
    
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.staff)).toBe(true);
    expect(Array.isArray(res.body.matrix)).toBe(true);
  });
});
