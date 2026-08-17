import request from 'supertest';
import { app } from '../app';
import { prisma } from '../config/prisma';
import { getTestToken, setupTestDB, teardownTestDB } from './testUtils';
import jwt from 'jsonwebtoken';
import { authenticate } from '../middleware/auth';

beforeAll(async () => {
  await setupTestDB();
});

afterAll(async () => {
  await teardownTestDB();
  await prisma.$disconnect();
});

describe('Impersonation (Read-Only Mode)', () => {
  const ceoToken = getTestToken('TEST_CEO', 'CEO');
  const accountToken = getTestToken('TEST_ACCOUNT', 'Account');
  let impersonatedToken = '';

  it('IMP-01: Authorized user (CEO) can impersonate another user', async () => {
    const res = await request(app)
      .post('/api/auth/impersonate')
      .set('Authorization', `Bearer ${ceoToken}`)
      .send({ targetStaffId: 'TEST_ACCOUNT' });
    
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    
    impersonatedToken = res.body.token;
    const decoded = jwt.decode(impersonatedToken) as any;
    expect(decoded.isReadOnly).toBe(true);
    expect(decoded.impersonatorRole).toBe('CEO');
    expect(decoded.staffId).toBe('TEST_ACCOUNT');
  });

  it('IMP-02: Unauthorized user (Account) cannot impersonate', async () => {
    // Account does not have system:impersonate
    const res = await request(app)
      .post('/api/auth/impersonate')
      .set('Authorization', `Bearer ${accountToken}`)
      .send({ targetStaffId: 'TEST_CEO' });
    
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Forbidden');
  });

  it('IMP-03: Impersonated token is blocked from destructive writes (Bulk Save)', async () => {
    const res = await request(app)
      .post('/api/admin/bulk-save')
      .set('Authorization', `Bearer ${impersonatedToken}`)
      .send({ clients: [] });
    
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Read-Only');
  });

  it('IMP-04: Impersonated token is blocked from overriding permissions', async () => {
    const res = await request(app)
      .post('/api/permissions/override')
      .set('Authorization', `Bearer ${impersonatedToken}`)
      .send({ targetStaffId: 'TEST_ACCOUNT', permissionCode: 'system:impersonate', granted: true });
    
    expect(res.status).toBe(403);
  });

  it('IMP-05: Impersonated token is allowed to perform reads (Dashboard)', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${impersonatedToken}`);
    
    // As long as it is not 403 Forbidden: Read-Only. 
    // It might be 200 or 500 depending on mock data, but we only care about RBAC here.
    expect(res.status).not.toBe(403);
  });
  it('IMP-06: Upward Impersonation Prevention', async () => {
    // Attempting to impersonate a CEO from a lower level account should be blocked
    // Account does not have system:impersonate anyway, but let's assume they did, the logic should block it.
    // Wait, IMP-02 already tests an unauthorized user (Account) cannot impersonate. Let's create a manager token with impersonate permission.
    await prisma.staffPermission.upsert({
      where: { staffId_permissionCode: { staffId: 'TEST_ACCOUNT', permissionCode: 'system:impersonate' } },
      update: { isGranted: true },
      create: { staffId: 'TEST_ACCOUNT', permissionCode: 'system:impersonate', isGranted: true }
    });

    const res = await request(app)
      .post('/api/auth/impersonate')
      .set('Authorization', `Bearer ${accountToken}`)
      .send({ targetStaffId: 'TEST_CEO' });
    
    // Upward impersonation should be blocked by contextual ABAC logic.
    // Let's assume the current code doesn't have it, or it returns 403.
    // If it's not implemented, it will fail, which is good.
    expect(res.status).toBe(403);
    
    // Cleanup
    await prisma.staffPermission.delete({
      where: { staffId_permissionCode: { staffId: 'TEST_ACCOUNT', permissionCode: 'system:impersonate' } }
    });
  });

  it('IMP-07: Audit Accuracy for Impersonation', async () => {
    // If Admin impersonates User A to update a timesheet
    // We check if AuditService logged it. We can just check the AuditLog table in DB.
    
    // In our test, there's no timesheet update test here, let's just trigger a timesheet update or impersonate action and check the AuditLog table.
    // Actually, maybe impersonation itself should be logged.
    const res = await request(app)
      .post('/api/auth/impersonate')
      .set('Authorization', `Bearer ${ceoToken}`)
      .send({ targetStaffId: 'TEST_ACCOUNT' });
    
    expect(res.status).toBe(200);

    const logs = await prisma.auditLog.findMany({
      where: { performedById: 'TEST_CEO', targetStaffId: 'TEST_ACCOUNT', action: 'IMPERSONATE_GRANTED' }
    });
    // This will fail if the developer didn't implement audit logging for impersonate.
    expect(logs.length).toBeGreaterThan(0);
  });
  it('IMP-08: Impersonated token can log timesheet and generates TIMESHEET_CREATED audit log', async () => {
    // Need a mock task first
    await prisma.client.upsert({ where: { clientCode: 'TEST_CLIENT' }, update: {}, create: { clientCode: 'TEST_CLIENT', name: 'Test' }});
    await prisma.project.upsert({ where: { projectCode: 'TEST_PROJ' }, update: {}, create: { projectCode: 'TEST_PROJ', clientCode: 'TEST_CLIENT', creativeLeadId: 'TEST_CEO', name: 'Test', status: 'Active', startDate: new Date() }});
    await prisma.task.upsert({ where: { taskId: 'test-task' }, update: {}, create: { taskId: 'test-task', projectCode: 'TEST_PROJ', name: 'Test', startDate: new Date(), deadline: new Date(), status: 'Active' }});

    // Attempt to log a timesheet using the impersonated token (CEO impersonating Account)
    const res = await request(app)
      .post('/api/timesheets')
      .set('Authorization', `Bearer ${impersonatedToken}`)
      .send({ 
        taskId: 'test-task',
        hoursLogged: 8,
        logDate: new Date().toISOString(),
        logSource: 'Test'
      });
    
    // We expect 201 Created according to developer's walkthrough (they added audit logs here)
    expect(res.status).toBe(201);
    
    // Check if Audit log is created
    const logs = await prisma.auditLog.findMany({
      where: { 
        performedById: 'TEST_CEO', 
        targetStaffId: 'TEST_ACCOUNT', 
        action: 'TIMESHEET_CREATED' 
      }
    });
    expect(logs.length).toBeGreaterThan(0);
  });

  it('IMP-09: Impersonated token is blocked from DELETE operations', async () => {
    // Add a dummy DELETE route protected by authenticate
    app.delete('/api/dummy-delete', authenticate, (req, res) => res.sendStatus(200));

    const res = await request(app)
      .delete('/api/dummy-delete')
      .set('Authorization', `Bearer ${impersonatedToken}`);
    
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('DELETE');
  });
});
