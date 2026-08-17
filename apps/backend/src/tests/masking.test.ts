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

describe('Suite 2: Context-Aware ABAC & Data Masking', () => {
  const accountToken = getTestToken('TEST_ACCOUNT', 'Account'); // Account has no explicit view_sensitive unless granted
  const ceoToken = getTestToken('TEST_CEO', 'CEO'); // CEO has view_sensitive via Role, wait, let's check what permissions testUtils gives.

  beforeAll(async () => {
    // Give CEO pnl:view_sensitive
    await prisma.permission.upsert({ where: { code: 'pnl:view_sensitive' }, update: {}, create: { code: 'pnl:view_sensitive', name: 'View PNL', category: 'PNL' } });
    await prisma.rolePermission.upsert({
      where: { roleCode_permissionCode: { roleCode: 'CEO', permissionCode: 'pnl:view_sensitive' } },
      update: {}, create: { roleCode: 'CEO', permissionCode: 'pnl:view_sensitive' }
    });
  });

  it('TC-2.1: Restricted User queries another user data -> Masked', async () => {
    const res = await request(app)
      .get('/api/staff')
      .set('Authorization', `Bearer ${accountToken}`);
    
    expect(res.status).toBe(200);
    const ceoData = res.body.find((s: any) => s.staffId === 'TEST_CEO');
    expect(ceoData.costPerHour).toBe('Censored');
  });

  it('TC-2.2: Restricted User queries their own data -> Fully visible', async () => {
    const res = await request(app)
      .get('/api/staff')
      .set('Authorization', `Bearer ${accountToken}`);
    
    expect(res.status).toBe(200);
    const myData = res.body.find((s: any) => s.staffId === 'TEST_ACCOUNT');
    expect(myData.costPerHour).toBe(50); // Original value from setupTestDB
  });

  it('TC-2.3: Account/CEO (with pnl:view_sensitive) queries any data -> Fully visible', async () => {
    const res = await request(app)
      .get('/api/staff')
      .set('Authorization', `Bearer ${ceoToken}`);
    
    expect(res.status).toBe(200);
    const accountData = res.body.find((s: any) => s.staffId === 'TEST_ACCOUNT');
    expect(accountData.costPerHour).toBe(50);
  });
});
