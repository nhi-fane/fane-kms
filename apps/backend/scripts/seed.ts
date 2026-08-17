import fs from 'fs';
import path from 'path';
import csvParser from 'csv-parser';
import { prisma } from './config/prisma';

async function seed() {
  console.log('Seeding from root CSVs...');

  const parseCsv = (filePath: string) => {
    return new Promise<any[]>((resolve, reject) => {
      const results: any[] = [];
      const absolutePath = path.resolve(__dirname, '../../../data/seeds', filePath);
      if (!fs.existsSync(absolutePath)) {
        console.warn(`File not found: ${absolutePath}`);
        return resolve([]);
      }
      fs.createReadStream(absolutePath)
        .pipe(csvParser())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  };

  const clients = await parseCsv('db-client.csv');
  for (const c of clients) {
    if (!c.ClientID) continue;
    await prisma.client.upsert({
      where: { code: c.ClientID },
      update: { name: c.ClientName, taxCode: c.TaxCode },
      create: { code: c.ClientID, name: c.ClientName, taxCode: c.TaxCode }
    });
  }

  const projects = await parseCsv('db-project.csv');
  for (const p of projects) {
    if (!p.ProjectID) continue;
    await prisma.project.upsert({
      where: { code: p.ProjectID },
      update: { name: p.ProjectName, clientCode: p.ClientID },
      create: { code: p.ProjectID, name: p.ProjectName, clientCode: p.ClientID }
    });
  }

  const sheets = await parseCsv('sheet.csv');
  for (const s of sheets) {
    if (!s.Date || !s.Email) continue;
    
    // Auto-create staff if missing
    const staffId = s.Email.split('@')[0];
    let staff = await prisma.staff.findUnique({ where: { staffId } });
    if (!staff) {
      staff = await prisma.staff.create({
        data: {
          staffId,
          fullName: s.Name || staffId,
          firstName: (s.Name || staffId).split(' ')[0],
          role: s.Role || 'Staff',
          costPerHour: parseFloat(s.CostPerHour) || 0,
        }
      });
    }

    // Attempt to parse Task, mock if needed
    let task = await prisma.task.findFirst({ where: { name: s.Task } });
    if (!task) {
       const dummyProject = projects[0]?.ProjectID || 'DUMMY';
       // Make sure DUMMY project exists
       if (dummyProject === 'DUMMY') {
         await prisma.project.upsert({
           where: { code: 'DUMMY' },
           update: {},
           create: { code: 'DUMMY', name: 'DUMMY', clientCode: clients[0]?.ClientID || 'CLI_DUMMY' }
         });
       }
       task = await prisma.task.create({
         data: {
           name: s.Task || 'General Task',
           status: 'Completed',
           projectCode: dummyProject,
           startDate: new Date('2025-01-01'),
           deadline: new Date('2025-12-31')
         }
       });
    }

    await prisma.timesheet.create({
      data: {
        staffId: staff.staffId,
        taskId: task.id,
        logDate: new Date(s.Date),
        hoursLogged: parseFloat(s['Hours Logged']) || 0,
        approvalStatus: 'Pending',
        logSource: 'CSV Import'
      }
    });
  }

  console.log('Seeding completed!');
}

seed().catch(console.error).finally(() => prisma.$disconnect());
