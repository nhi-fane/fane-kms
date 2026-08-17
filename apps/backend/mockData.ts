import { prisma } from './src/config/prisma';

async function main() {
  const staff = await prisma.staff.findFirst({ where: { fullName: { contains: 'Bùi Nguyễn Việt Quang' } } });
  if (!staff) {
    console.log('Staff not found');
    return;
  }
  console.log('Found staff:', staff.fullName);
  
  const project = await prisma.project.findFirst({ where: { status: { not: 'Closed' } } });
  if (!project) {
    console.log('No active project found');
    return;
  }
  
  const parentTask = await prisma.task.create({
    data: {
      projectCode: project.projectCode,
      name: 'Design System Update (Mock)',
      startDate: new Date(),
      deadline: new Date(new Date().setDate(new Date().getDate() + 5)),
      status: 'In Progress',
      assignees: {
        create: [{ staffId: staff.staffId }]
      }
    }
  });
  
  const subTask1 = await prisma.task.create({
    data: {
      parentTaskId: parentTask.taskId,
      projectCode: project.projectCode,
      name: 'Update Color Palette',
      startDate: new Date(),
      deadline: new Date(new Date().setDate(new Date().getDate() + 2)),
      status: 'In Progress',
      assignees: {
        create: [{ staffId: staff.staffId }]
      }
    }
  });

  const subTask2 = await prisma.task.create({
    data: {
      parentTaskId: parentTask.taskId,
      projectCode: project.projectCode,
      name: 'Update Typography',
      startDate: new Date(new Date().setDate(new Date().getDate() + 2)),
      deadline: new Date(new Date().setDate(new Date().getDate() + 4)),
      status: 'In Progress',
      assignees: {
        create: [{ staffId: staff.staffId }]
      }
    }
  });
  
  console.log('Created Mock Tasks:', parentTask.name, subTask1.name, subTask2.name);
}
main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
