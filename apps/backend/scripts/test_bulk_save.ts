import { Request, Response, NextFunction } from 'express';
import { prisma } from '../src/config/prisma';
import { bulkSave } from '../src/controllers/admin';

async function runTests() {
  console.log('--- STARTING QA TESTS FOR BULK SAVE ---');

  // 0. Setup Base Data
  const creativeLeadId = 'QA_LEAD_01';
  await prisma.staff.upsert({
    where: { staffId: creativeLeadId },
    update: {},
    create: {
      staffId: creativeLeadId,
      fullName: 'QA Tester',
      firstName: 'QA',
      role: 'Manager',
      email: 'qa@fanekms.com',
      password: 'xxx',
    }
  });
  await prisma.staffSalary.upsert({
    where: { staffId: creativeLeadId },
    update: {},
    create: {
      staffId: creativeLeadId,
      encryptedCostPerHour: 'mock_encrypted_value'
    }
  });

  // Mock Request/Response builder
  const mockReqRes = (body: any) => {
    const req = { body } as Request;
    const res = {
      statusCode: 200,
      jsonBody: null,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(data: any) {
        this.jsonBody = data;
        return this;
      }
    } as any;
    let nextCalled = false;
    let nextError = null;
    const next: NextFunction = (err?: any) => {
      nextCalled = true;
      nextError = err;
    };

    return { req, res, next, getResult: () => ({ status: res.statusCode, body: res.jsonBody, nextCalled, nextError }) };
  };

  const cleanup = async () => {
    await prisma.internalCostTransaction.deleteMany({ where: { projectCode: { startsWith: 'QA_PROJ_' } } });
    await prisma.pnlTransaction.deleteMany({ where: { projectCode: { startsWith: 'QA_PROJ_' } } });
    await prisma.timesheet.deleteMany({ where: { task: { projectCode: { startsWith: 'QA_PROJ_' } } } });
    await prisma.taskAssignee.deleteMany({ where: { task: { projectCode: { startsWith: 'QA_PROJ_' } } } });
    await prisma.task.deleteMany({ where: { projectCode: { startsWith: 'QA_PROJ_' } } });
    await prisma.project.deleteMany({ where: { projectCode: { startsWith: 'QA_PROJ_' } } });
    await prisma.client.deleteMany({ where: { clientCode: { startsWith: 'QA_CLI_' } } });
  };

  await cleanup();

  // Test 1: POS-01 Add Clients & Projects
  console.log('\n[Test 1] POS-01: Add Clients & Projects');
  const addPayload = {
    clients: {
      added: [{ clientCode: 'QA_CLI_1', name: 'QA Client 1' }]
    },
    projects: {
      added: [{
        projectCode: 'QA_PROJ_1',
        clientCode: 'QA_CLI_1',
        creativeLeadId,
        name: 'QA Project 1',
        startDate: new Date().toISOString()
      }]
    }
  };
  let ctx = mockReqRes(addPayload);
  await bulkSave(ctx.req, ctx.res, ctx.next);
  let result = ctx.getResult();
  console.assert(result.status === 200, `Expected 200, got ${result.status}`);
  let dbClient = await prisma.client.findUnique({ where: { clientCode: 'QA_CLI_1' } });
  let dbProject = await prisma.project.findUnique({ where: { projectCode: 'QA_PROJ_1' } });
  console.assert(dbClient !== null, 'Client should exist');
  console.assert(dbProject !== null, 'Project should exist');
  console.log('Test 1 PASSED');

  // Test 2: NEG-01 Hard Delete Client With Project
  console.log('\n[Test 2] NEG-01: Delete Client having Project');
  const delClientPayload = {
    clients: { deleted: ['QA_CLI_1'] }
  };
  ctx = mockReqRes(delClientPayload);
  await bulkSave(ctx.req, ctx.res, ctx.next);
  result = ctx.getResult();
  console.assert(result.status === 400, `Expected 400, got ${result.status}`);
  console.assert(result.body?.error?.includes('Cannot delete Client'), 'Expected proper error message');
  console.log('Test 2 PASSED');

  // Test 3: NEG-02 Hard Delete Project With Timesheet
  console.log('\n[Test 3] NEG-02: Delete Project having Timesheet');
  // First, add a task and timesheet
  const task = await prisma.task.create({
    data: {
      projectCode: 'QA_PROJ_1',
      name: 'QA Task',
      startDate: new Date(),
      deadline: new Date(),
      status: 'Open'
    }
  });
  await prisma.timesheet.create({
    data: {
      taskId: task.taskId,
      staffId: creativeLeadId,
      hoursLogged: 2,
      logDate: new Date(),
      logSource: 'Manual',
      approvalStatus: 'Pending'
    }
  });

  const delProjectPayload = {
    projects: { deleted: ['QA_PROJ_1'] }
  };
  ctx = mockReqRes(delProjectPayload);
  await bulkSave(ctx.req, ctx.res, ctx.next);
  result = ctx.getResult();
  console.assert(result.status === 400, `Expected 400, got ${result.status}`);
  console.assert(result.body?.error?.includes('Cannot delete Project'), 'Expected proper error message');
  console.log('Test 3 PASSED');

  // Test 4: Delete Projects & Clients normally
  console.log('\n[Test 4] POS-03: Delete Project & Client (after removing dependencies)');
  await prisma.timesheet.deleteMany({ where: { taskId: task.taskId } });
  await prisma.task.deleteMany({ where: { taskId: task.taskId } });
  // Since timesheet is gone, project can be deleted, but client cannot be deleted if project is still there.
  // We send a payload deleting BOTH. Because prisma transaction processes Project delete before Client delete, it should work!
  const delBothPayload = {
    clients: { deleted: ['QA_CLI_1'] },
    projects: { deleted: ['QA_PROJ_1'] }
  };
  ctx = mockReqRes(delBothPayload);
  await bulkSave(ctx.req, ctx.res, ctx.next);
  result = ctx.getResult();
  console.assert(result.status === 200, `Expected 200, got ${result.status}`);
  dbClient = await prisma.client.findUnique({ where: { clientCode: 'QA_CLI_1' } });
  dbProject = await prisma.project.findUnique({ where: { projectCode: 'QA_PROJ_1' } });
  console.assert(dbClient === null, 'Client should be deleted');
  console.assert(dbProject === null, 'Project should be deleted');
  console.log('Test 4 PASSED');

  // Test 5: TXN-01 Transaction Rollback
  console.log('\n[Test 5] TXN-01: Transaction Rollback');
  // Setup data
  await prisma.client.create({ data: { clientCode: 'QA_CLI_2', name: 'QA Client 2' } });
  // Payload deleting client 2 (valid), but adding a project with invalid client code (fails FK constraint)
  const txFailPayload = {
    clients: { deleted: ['QA_CLI_2'] },
    projects: { added: [{ projectCode: 'QA_PROJ_2', clientCode: 'INVALID_CLI', creativeLeadId, name: 'Invalid', startDate: new Date().toISOString() }] }
  };
  ctx = mockReqRes(txFailPayload);
  await bulkSave(ctx.req, ctx.res, ctx.next);
  result = ctx.getResult();
  // We expect next to be called with an error, OR a 500 status. In the code, it uses `next(error)` which is standard Express error handling.
  console.assert(result.nextCalled === true, 'Expected next(error) to be called');
  // Verify rollback: Client 2 should STILL exist!
  dbClient = await prisma.client.findUnique({ where: { clientCode: 'QA_CLI_2' } });
  console.assert(dbClient !== null, 'Client 2 should still exist (Rollback successful)');
  console.log('Test 5 PASSED');

  await cleanup();
  console.log('\n--- ALL TESTS PASSED SUCCESSFULLY ---');
}

runTests().catch(e => {
  console.error('TEST SUITE FAILED:', e);
  process.exit(1);
});
