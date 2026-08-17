import { PrismaClient } from '@prisma/client';
import { createTask } from '../src/controllers/task';

const prisma = new PrismaClient();

async function runTests() {
  console.log("Starting QA QC Testing Scheme for Task Assignee Rules...");

  let project = await prisma.project.findFirst();
  if (!project) {
    console.log("No projects found, skipping tests.");
    return;
  }
  const projectCode = project.projectCode;

  let totalTests = 7;
  let passed = 0;

  const test = async (id: string, user: any, assignees: string[], expectedStatus: number, desc: string) => {
    let statusCode = 200;
    let jsonBody: any = null;
    
    const req = {
      body: {
        projectCode,
        name: "Test Task",
        startDate: new Date().toISOString(),
        deadline: new Date().toISOString(),
        assigneeIds: assignees
      },
      user: user
    };

    const res = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (data: any) => {
        jsonBody = data;
      }
    };
    
    let errorCaught = null;
    try {
        await createTask(req as any, res as any, (err: any) => { errorCaught = err; });
    } catch(e) { errorCaught = e; }

    if (errorCaught) {
        console.log(`❌ ${id} FAIL: ${desc}. Exception caught`, errorCaught);
        return;
    }

    if (statusCode === expectedStatus) {
      console.log(`✅ ${id} PASS: ${desc}`);
      passed++;
      if (statusCode === 201 && jsonBody && jsonBody.taskId) {
        await prisma.task.delete({ where: { taskId: jsonBody.taskId } });
      }
    } else {
      console.log(`❌ ${id} FAIL: ${desc}. Expected ${expectedStatus}, got ${statusCode}`);
      console.log(jsonBody);
    }
  };

  const staff = { staffId: 'DES_A1', role: 'Staff' };
  const lead = { staffId: 'CPL_A', role: 'Creative Project Lead' };
  const account = { staffId: 'ACC_01', role: 'Account' };

  await test('UT-01', staff, ['DES_A1'], 201, 'Staff assign to self');
  await test('UT-02', lead, ['DES_A1'], 201, 'Lead assign to lower level');
  await test('UT-03', lead, ['CPL_B'], 201, 'Lead assign to equal level');
  await test('UT-04', staff, ['CD_01'], 403, 'Staff assign to higher level (Director)');
  await test('UT-05', staff, ['DES_A1', 'CPL_A'], 403, 'Staff mix valid and invalid assignees');
  await test('UT-06', account, ['CD_01', 'CPL_A', 'DES_A1'], 201, 'Account assign to all');
  await test('UT-07', account, ['KT_01'], 201, 'Account assign to accountant');

  console.log(`\nTest Summary: ${passed}/${totalTests} Passed.`);
  process.exit(0);
}

runTests().catch(console.error);
