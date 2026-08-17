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

describe('Suite 1: Data Leakage & Password Omission', () => {
  const adminToken = getTestToken('TEST_CEO', 'CEO');

  it('TC-1.1: GET /api/staff omits password field', async () => {
    const res = await request(app)
      .get('/api/staff')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    for (const user of res.body) {
      expect(user.password).toBeUndefined();
    }
  });

  it('TC-1.3: Login flow still works (selects password manually)', async () => {
    // In testUtils.ts, we used 'hashed_password' for TEST_CEO
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ceo@test.com', password: 'hashed_password' });
    
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });
});
