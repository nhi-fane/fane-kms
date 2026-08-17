import request from 'supertest';
import { app } from '../app';
import { prisma } from '../config/prisma';
import { getTestToken, setupTestDB, teardownTestDB } from './testUtils';
import jwt from 'jsonwebtoken';

beforeAll(async () => {
  await setupTestDB();
});

afterAll(async () => {
  await teardownTestDB();
  await prisma.$disconnect();
});

describe('Suite 3: Token Revocation & Zero-Latency Auth', () => {
  let initialToken = '';

  beforeAll(async () => {
    // Get a valid token from login to have the tokenVersion in it
    const res = await request(app).post('/api/auth/login').send({ email: 'ceo@test.com', password: 'hashed_password' });
    initialToken = res.body.token;
  });

  it('TC-3.1: Send valid request with JWT -> 200 OK', async () => {
    const res = await request(app)
      .get('/api/staff')
      .set('Authorization', `Bearer ${initialToken}`);
    expect(res.status).toBe(200);
  });

  it('TC-3.2: Admin manually increments tokenVersion', async () => {
    await prisma.staff.update({
      where: { email: 'ceo@test.com' },
      data: { tokenVersion: { increment: 1 } }
    });
  });

  it('TC-3.3: User replays the exact same JWT -> 401 Unauthorized', async () => {
    const res = await request(app)
      .get('/api/staff')
      .set('Authorization', `Bearer ${initialToken}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('revoked');
  });
});
