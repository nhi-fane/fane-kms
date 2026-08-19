import { PrismaClient } from '@prisma/client';
import { encrypt } from '../src/utils/crypto';

const prisma = new PrismaClient();

async function main() {
  const staffId = 'CPL_B'; // Anh Linh Linh
  const projectCode = 'PRJ_03'; // Coca-Cola - Social AWO
  
  // Find a task for this project assigned to this staff
  const taskAssignee = await prisma.taskAssignee.findFirst({
    where: {
      staffId: staffId,
      task: {
        projectCode: projectCode
      }
    },
    include: {
      task: true
    }
  });

  if (!taskAssignee) {
    console.log("No task found for PRJ_03 and CPL_B");
    return;
  }

  const costPerHour = 300000;

  // Create timesheet for June 21, 2026
  const ts1 = await prisma.timesheet.create({
    data: {
      staffId: staffId,
      taskId: taskAssignee.taskId,
      hoursLogged: 5,
      logDate: new Date('2026-06-21T00:00:00.000Z'),
      logSource: 'Web',
      approvalStatus: 'Approved',
      approvedById: 'CD_01'
    }
  });

  await prisma.internalCostTransaction.create({
    data: {
      projectCode: projectCode,
      timesheetId: ts1.logId,
      encryptedHistoricalRate: encrypt(costPerHour.toString()),
      encryptedAmount: encrypt((5 * costPerHour).toString()),
      transactionDate: new Date('2026-06-21T00:00:00.000Z')
    }
  });

  // Create timesheet for June 22, 2026
  const ts2 = await prisma.timesheet.create({
    data: {
      staffId: staffId,
      taskId: taskAssignee.taskId,
      hoursLogged: 5,
      logDate: new Date('2026-06-22T00:00:00.000Z'),
      logSource: 'Web',
      approvalStatus: 'Approved',
      approvedById: 'CD_01'
    }
  });

  await prisma.internalCostTransaction.create({
    data: {
      projectCode: projectCode,
      timesheetId: ts2.logId,
      encryptedHistoricalRate: encrypt(costPerHour.toString()),
      encryptedAmount: encrypt((5 * costPerHour).toString()),
      transactionDate: new Date('2026-06-22T00:00:00.000Z')
    }
  });

  console.log("Successfully added 10 hours for Anh Linh Linh on Coca-Cola - Social AWO for dates 21/06/2026 and 22/06/2026");
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());