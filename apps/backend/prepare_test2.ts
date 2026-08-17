import { prisma } from './src/config/prisma';

async function prepareData() {
  const staff = await prisma.staff.create({
    data: { staffId: 'jane.smith', firstName: 'Jane', fullName: 'Jane Smith', role: 'Staff', costPerHour: 15 }
  });
  const task = await prisma.task.create({
    data: { projectCode: 'PRJ01', name: 'UI Design Task', status: 'In_Progress', startDate: new Date(), deadline: new Date() }
  });
  console.log(`STAFF_ID: ${staff.staffId}`);
  console.log(`TASK_ID: ${task.taskId}`);
}
prepareData().catch(console.error).finally(() => prisma.$disconnect());
