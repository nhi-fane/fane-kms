import { prisma } from './src/config/prisma';

async function testStep1() {
  const staff = await prisma.staff.findFirst();
  const task = await prisma.task.findFirst();
  
  if (!staff || !task) {
    console.log('No staff or task found to test');
    return;
  }
  
  console.log(`[Plan] POST /api/timesheets for Staff: ${staff.staffId}, Task: ${task.taskId}`);
  
  const response = await fetch('http://localhost:3000/api/timesheets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'cf-access-authenticated-user-email': 'test@fan-e.com',
      'x-dev-staff-id': staff.staffId
    },
    body: JSON.stringify({
      taskId: task.taskId,
      hoursLogged: 8,
      logDate: new Date().toISOString()
    })
  });
  
  const data = await response.json();
  console.log('HTTP Status:', response.status);
  console.log('Response Body:', data);
  
  const pnl = await prisma.pnlTransaction.findMany({ where: { timesheetId: data.logId }});
  console.log('P&L Transactions created:', pnl.length);
}
testStep1().catch(console.error).finally(() => prisma.$disconnect());
