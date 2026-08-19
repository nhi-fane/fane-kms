import { PrismaClient } from '@prisma/client';
import { encrypt } from '../src/utils/crypto';

const prisma = new PrismaClient({});

async function main() {
  console.log('🌱 Starting database seeding with comprehensive cases...');

  // 1. Clean up existing data
  await prisma.internalCostTransaction.deleteMany();
  await prisma.pnlTransaction.deleteMany();
  await prisma.timesheet.deleteMany();
  await prisma.taskAssignee.deleteMany();
  await prisma.task.deleteMany();
  await prisma.staffLeaveLog.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.staffSalary.deleteMany();
  await prisma.staff.deleteMany();

  // 2. Create Staff (9 roles as requested)
  console.log('Creating Staff...');
  const staffData = [
    { staffId: 'ACC_01', fullName: 'Nguyen Account', firstName: 'Nguyen', role: 'Account', costPerHour: 100000, level: 6, standardHoursPerDay: 8 },
    { staffId: 'CD_01', fullName: 'Tran Creative Director', firstName: 'Tran', role: 'Creative Director', costPerHour: 500000, level: 2, standardHoursPerDay: 8 },
    { staffId: 'CPL_A', fullName: 'Le Project Lead A', firstName: 'Le', role: 'Creative Project Lead', costPerHour: 300000, level: 3, standardHoursPerDay: 8 },
    { staffId: 'DES_A1', fullName: 'Pham Designer A1', firstName: 'Pham', role: 'Staff', costPerHour: 150000, level: 5, standardHoursPerDay: 8 },
    { staffId: 'CW_A1', fullName: 'Vu Copywriter A1', firstName: 'Vu', role: 'Staff', costPerHour: 150000, level: 5, standardHoursPerDay: 8 },
    { staffId: 'CPL_B', fullName: 'Hoang Project Lead B', firstName: 'Hoang', role: 'Creative Project Lead', costPerHour: 300000, level: 3, standardHoursPerDay: 8 },
    { staffId: 'DES_B1', fullName: 'Ngo Designer B1', firstName: 'Ngo', role: 'Staff', costPerHour: 150000, level: 5, standardHoursPerDay: 8 },
    { staffId: 'DES_B2', fullName: 'Bui Designer B2', firstName: 'Bui', role: 'Staff', costPerHour: 150000, level: 5, standardHoursPerDay: 8 },
    { staffId: 'KT_01', fullName: 'Dinh Ke Toan', firstName: 'Dinh', role: 'Kế toán', costPerHour: 120000, level: 6, standardHoursPerDay: 8 },
  ];

  for (const s of staffData) {
    const { costPerHour, ...staffFields } = s;
    await prisma.staff.create({ data: staffFields });
    await prisma.staffSalary.create({
      data: {
        staffId: s.staffId,
        encryptedCostPerHour: encrypt(costPerHour.toString())
      }
    });
  }

  // 3. Create Clients
  console.log('Creating Clients...');
  const clients = await Promise.all([
    prisma.client.create({ data: { clientCode: 'CLI_1', name: 'Tech Corp' } }),
    prisma.client.create({ data: { clientCode: 'CLI_2', name: 'FMCG Brand' } }),
    prisma.client.create({ data: { clientCode: 'CLI_3', name: 'Local Startup' } }),
  ]);

  // 4. Create Projects (10 projects with all cases)
  console.log('Creating 10 Projects...');
  const today = new Date();
  const pastWeek = new Date(today); pastWeek.setDate(today.getDate() - 7);
  const futureWeek = new Date(today); futureWeek.setDate(today.getDate() + 7);

  const projectsData = [
    { code: 'PRJ_01', client: 'CLI_1', lead: 'CPL_A', name: 'Apple - Product Launch', status: 'In Progress', start: new Date('2025-03-15'), end: new Date('2025-06-15') },
    { code: 'PRJ_02', client: 'CLI_1', lead: 'CPL_B', name: 'Nike - Summer Campaign', status: 'Closed', start: new Date('2025-05-01'), end: new Date('2025-08-30') },
    { code: 'PRJ_03', client: 'CLI_2', lead: 'CPL_A', name: 'Coca-Cola - Social AWO', status: 'Closed', start: new Date('2025-09-01'), end: new Date('2025-12-15') },
    { code: 'PRJ_04', client: 'CLI_2', lead: 'CPL_B', name: 'Samsung - GTM Strategy', status: 'Pending Feedback', start: new Date('2026-01-10'), end: new Date('2026-03-20') },
    { code: 'PRJ_05', client: 'CLI_3', lead: 'CD_01', name: 'Tesla - Rebranding', status: 'In Progress', start: new Date('2026-02-15'), end: new Date('2026-06-30') },
    { code: 'PRJ_06', client: 'CLI_1', lead: 'CPL_A', name: 'Google - Developer Event', status: 'Pending Feedback', start: new Date('2026-05-01'), end: new Date('2026-07-15') },
    { code: 'PRJ_07', client: 'CLI_2', lead: 'CPL_B', name: 'Lego - Holiday Special', status: 'In Progress', start: new Date('2026-06-01'), end: new Date('2026-11-30') },
    { code: 'PRJ_08', client: 'CLI_3', lead: 'CPL_A', name: 'Sony - PR Stunt', status: 'In Progress', start: new Date('2026-08-15'), end: new Date('2026-10-15') },
    { code: 'PRJ_09', client: 'CLI_1', lead: 'CPL_B', name: 'McDonald\'s - Anniversary Promo', status: 'Not Started', start: new Date('2026-11-01'), end: new Date('2027-01-30') },
    { code: 'PRJ_10', client: 'CLI_2', lead: 'CD_01', name: 'Spotify - Year in Review', status: 'In Progress', start: new Date('2026-12-01'), end: new Date('2027-02-15') },
    { code: 'PRJ_11', client: 'CLI_1', lead: 'CPL_A', name: 'August Campaign A', status: 'Not Started', start: new Date('2027-01-15'), end: new Date('2027-02-20') },
    { code: 'PRJ_12', client: 'CLI_2', lead: 'CD_01', name: 'July-August Retainer', status: 'In Progress', start: new Date('2025-06-01'), end: new Date('2027-02-20') },
  ];

  for (const p of projectsData) {
    await prisma.project.create({
      data: {
        projectCode: p.code,
        clientCode: p.client,
        creativeLeadId: p.lead,
        name: p.name,
        status: p.status,
        startDate: p.start,
        endDate: p.end
      }
    });
  }

  // 5. Create Tasks (70 tasks)
  console.log('Creating 70 Tasks...');
  const tasksCreated = [];
  let taskCounter = 1;
  const projectCodes = projectsData.map(p => p.code).filter(c => c !== 'PRJ_08');

  for (let i = 0; i < 70; i++) {
    const pCode = projectCodes[i % projectCodes.length];
    const isCompleted = i % 5 === 0;
    const isOverdue = i % 7 === 0;

    const pStart = projectsData.find(p => p.code === pCode)!.start;
    const pEnd = projectsData.find(p => p.code === pCode)!.end;
    
    // Distribute tasks throughout the project duration
    const duration = pEnd.getTime() - pStart.getTime();
    const start = new Date(pStart.getTime() + (duration * (i / 70)));
    const end = new Date(start.getTime() + 86400000 * (3 + (i % 10)));
    if (end > pEnd) end.setTime(pEnd.getTime());
    if (isOverdue) end.setDate(today.getDate() - 5);

    const task = await prisma.task.create({
      data: {
        projectCode: pCode,
        name: `Task ${taskCounter++} for ${pCode}`,
        status: isCompleted ? 'Completed' : 'In Progress',
        startDate: start,
        deadline: end,
      }
    });

    // Assignees
    const assignees = [];
    if (i % 3 === 0) assignees.push('DES_A1');
    if (i % 2 === 0) assignees.push('CW_A1');
    if (i % 5 === 0) assignees.push('DES_B1');
    if (assignees.length === 0) assignees.push('DES_B2');

    for (const a of assignees) {
      await prisma.taskAssignee.create({
        data: {
          taskId: task.taskId,
          staffId: a,
          isDone: isCompleted
        }
      });
    }
    tasksCreated.push(task);

    // Create a sub-task for 30% of tasks
    if (i % 3 === 0) {
      const subEnd = new Date(end);
      subEnd.setDate(end.getDate() - 1);
      const subTask = await prisma.task.create({
        data: {
          projectCode: pCode,
          parentTaskId: task.taskId,
          name: `Sub-task for Task ${taskCounter - 1}`,
          status: isCompleted ? 'Completed' : 'In Progress',
          startDate: start,
          deadline: subEnd,
        }
      });
      await prisma.taskAssignee.create({
        data: {
          taskId: subTask.taskId,
          staffId: assignees[0] || 'DES_B2',
          isDone: isCompleted
        }
      });
      tasksCreated.push(subTask);
    }
  }

  // Add long-running tasks spanning July and August
  console.log('Creating long-running tasks for July/August...');
  for (let i = 0; i < 20; i++) {
    const start = new Date(projectsData[0].start.getTime() + (i * 86400000 * 20));
    const end = new Date(start);
    end.setDate(start.getDate() + 30 + (i % 10));
    
    if (i >= 15) {
      end.setDate(start.getDate() + 90); // Extends widely
    }

    const task = await prisma.task.create({
      data: {
        projectCode: i % 2 === 0 ? 'PRJ_11' : 'PRJ_12',
        name: `Long term task ${i + 1}`,
        status: 'In Progress',
        startDate: start,
        deadline: end,
      }
    });

    await prisma.taskAssignee.create({
      data: {
        taskId: task.taskId,
        staffId: i % 2 === 0 ? 'DES_A1' : 'CW_A1',
        isDone: false
      }
    });
    tasksCreated.push(task);
  }

  // 6. Create StaffLeaveLogs (7 cases)
  console.log('Creating 7 Staff Leaves...');
  await prisma.staffLeaveLog.createMany({
    data: [
      { staffId: 'DES_A1', duration: 1, leaveDate: new Date(today.getTime() - 86400000*2), session: 'FullDay', status: 'Approved', approvedById: 'CPL_A' },
      { staffId: 'CW_A1', duration: 0.5, leaveDate: new Date(today.getTime() + 86400000*3), session: 'Morning', status: 'Approved', approvedById: 'CPL_A' },
      { staffId: 'DES_B1', duration: 1, leaveDate: new Date(today.getTime() + 86400000*5), session: 'FullDay', status: 'Pending' },
      { staffId: 'CPL_A', duration: 1, leaveDate: today, session: 'FullDay', status: 'Approved', approvedById: 'CD_01' },
      { staffId: 'CPL_A', duration: 1, leaveDate: new Date(today.getTime() + 86400000), session: 'FullDay', status: 'Approved', approvedById: 'CD_01' }, // day 2
      { staffId: 'DES_B2', duration: 1, leaveDate: new Date('2026-06-20'), session: 'FullDay', status: 'Pending' },
      { staffId: 'CD_01', duration: 1, leaveDate: today, session: 'FullDay', status: 'Pending' },
      { staffId: 'DES_A1', duration: 1, leaveDate: new Date(today.getTime() - 86400000*10), session: 'FullDay', status: 'Pending' },
    ]
  });

  // 6.5 Create CompanyHolidays
  console.log('Creating Company Holidays...');
  await prisma.companyHoliday.deleteMany(); // clean up
  await prisma.companyHoliday.createMany({
    data: [
      { name: 'Hung Kings Commemoration', startDate: new Date('2026-04-26'), endDate: new Date('2026-04-26') },
      { name: 'Reunification Day', startDate: new Date('2026-04-30'), endDate: new Date('2026-04-30') },
      { name: 'Labor Day', startDate: new Date('2026-05-01'), endDate: new Date('2026-05-01') },
      { name: 'Independence Day', startDate: new Date('2026-09-02'), endDate: new Date('2026-09-02') },
      { name: 'Summer Retreat (Company)', startDate: new Date('2026-06-25'), endDate: new Date('2026-06-26') } // mock recent holiday
    ]
  });

  // 7. Create Realistic Timesheets
  console.log('Creating Realistic Timesheets...');
  let logIdCounter = 1;
  for (let i = 0; i < tasksCreated.length; i++) {
    const task = tasksCreated[i];
    const assigneeData = await prisma.taskAssignee.findFirst({ where: { taskId: task.taskId } });
    if (!assigneeData) continue;
    
    // Leave some tasks without logs to simulate planned/unstarted tasks
    if (i % 10 === 0) continue; 
    
    const staffId = assigneeData.staffId;
    const isCompleted = task.status === 'Completed';
    
    const start = new Date(task.startDate);
    if (start > today) continue; // Future tasks have no logs
    
    let endLog = new Date(task.deadline);
    if (endLog > today) endLog = new Date(today); // Can't log future hours
    if (isCompleted && endLog > task.deadline) endLog = new Date(task.deadline);
    
    // Simulate some tasks finishing early
    if (isCompleted && i % 4 === 0) {
       endLog.setDate(endLog.getDate() - 1); 
    }
    // Simulate some tasks starting late (Delay)
    if (i % 3 === 0) {
       start.setDate(start.getDate() + 2);
    }
    
    // Generate daily logs
    for (let d = new Date(start); d <= endLog; d.setDate(d.getDate() + 1)) {
        if (d.getDay() === 0 || d.getDay() === 6) continue; // Skip weekends
        
        let hours = 4 + Math.floor(Math.random() * 4); // 4 to 7 hours
        if (i === 1) hours = 14; // Overload case
        
        const logDate = new Date(d);
        const approvalStatus = (logDate.getTime() < today.getTime() - 86400000) ? 'Approved' : 'Pending';
        
        const log = await prisma.timesheet.create({
          data: {
            staffId,
            taskId: task.taskId,
            hoursLogged: hours,
            logDate: logDate,
            logSource: d.getDate() % 2 === 0 ? 'Web' : 'Telegram',
            approvalStatus,
            approvedById: approvalStatus === 'Approved' ? 'CPL_A' : null
          }
        });

        if (approvalStatus === 'Approved' && hours > 0) {
          const costPerHour = 150000;
          const amount = hours * costPerHour;
          await prisma.internalCostTransaction.create({
            data: {
              projectCode: task.projectCode,
              timesheetId: log.logId,
              encryptedHistoricalRate: encrypt(costPerHour.toString()),
              encryptedAmount: encrypt(amount.toString()),
              transactionDate: logDate
            }
          });
        }
    }
  }

  // Assign heavy workload to CPL_B (Anh Linh Linh)
  const hangTaskData = [
    { projectCode: 'PRJ_01', hours: 50 },
    { projectCode: 'PRJ_01', hours: 50 },
    { projectCode: 'PRJ_02', hours: 40 },
    { projectCode: 'PRJ_02', hours: 40 },
    { projectCode: 'PRJ_03', hours: 38.4 },
  ];

  for (let idx = 0; idx < hangTaskData.length; idx++) {
    const data = hangTaskData[idx];
    const task = await prisma.task.create({
      data: {
        projectCode: data.projectCode,
        name: `Heavy Workload ${idx + 1} for Anh Linh Linh`,
        status: 'In Progress',
        startDate: pastWeek,
        deadline: today,
      }
    });

    await prisma.taskAssignee.create({
      data: {
        taskId: task.taskId,
        staffId: 'CPL_B',
        isDone: false
      }
    });

    for (let d = 0; d < 5; d++) {
      const logD = new Date(today);
      logD.setDate(today.getDate() - d);
      if (logD.getDay() === 0 || logD.getDay() === 6) continue;
      
      const log = await prisma.timesheet.create({
        data: {
          staffId: 'CPL_B',
          taskId: task.taskId,
          hoursLogged: data.hours / 4, // rough spread
          logDate: logD,
          logSource: 'Web',
          approvalStatus: 'Approved',
          approvedById: 'CD_01'
        }
      });
      
      const costPerHour = 300000;
      const amount = (data.hours / 4) * costPerHour;
      await prisma.internalCostTransaction.create({
        data: {
          projectCode: task.projectCode,
          timesheetId: log.logId,
          encryptedHistoricalRate: encrypt(costPerHour.toString()),
          encryptedAmount: encrypt(amount.toString()),
          transactionDate: logD
        }
      });
    }
  }

  console.log('✅ Seeding complete!');
}

main().catch(console.error).finally(() => prisma.$disconnect());