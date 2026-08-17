import { prisma } from './src/config/prisma';

async function seedTest() {
  const client = await prisma.client.create({
    data: { clientCode: 'CLI01', name: 'Test Client' }
  });
  const staff = await prisma.staff.create({
    data: { staffId: 'john.doe', firstName: 'John', fullName: 'John Doe', role: 'Staff', costPerHour: 10 }
  });
  const project = await prisma.project.create({
    data: { projectCode: 'PRJ01', clientCode: 'CLI01', creativeLeadId: 'john.doe', name: 'Test Project', status: 'In_Progress', startDate: new Date() }
  });
  const task = await prisma.task.create({
    data: { projectCode: 'PRJ01', name: 'Test Task', status: 'In_Progress', startDate: new Date(), deadline: new Date() }
  });
  console.log('Test data created');
}
seedTest().catch(console.error).finally(() => prisma.$disconnect());
