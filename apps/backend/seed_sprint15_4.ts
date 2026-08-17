import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding 10 clients and 50 projects for Volume Testing...");

  // 1. Create a default Creative Lead if not exists
  const lead = await prisma.staff.upsert({
    where: { staffId: 'LEAD_TEST_01' },
    update: {},
    create: {
      staffId: 'LEAD_TEST_01',
      fullName: 'Test Creative Lead',
      firstName: 'Test',
      role: 'Creative Lead',
      costPerHour: 50,
      email: 'lead_test01@fane.com',
      password: 'password123',
    }
  });

  // 2. Create 10 Clients
  const clientCodes = [];
  for (let i = 1; i <= 10; i++) {
    const code = `CLI_TEST_${i}`;
    clientCodes.push(code);
    await prisma.client.upsert({
      where: { clientCode: code },
      update: {},
      create: {
        clientCode: code,
        name: `Test Client ${i}`,
        industry: 'Software Testing'
      }
    });
  }

  // 3. Create 50 Projects
  for (let i = 1; i <= 50; i++) {
    const projectCode = `PROJ_TEST_${i}`;
    const clientCode = clientCodes[i % 10]; // Distribute evenly (5 projects per client)
    
    // Status can be Active or Archived
    const status = i % 5 === 0 ? 'Archived' : 'Active';
    
    await prisma.project.upsert({
      where: { projectCode },
      update: {},
      create: {
        projectCode,
        clientCode,
        creativeLeadId: lead.staffId,
        name: `Volume Test Project ${i}`,
        status: status,
        startDate: new Date(),
        endDate: new Date(new Date().getTime() + 14 * 24 * 60 * 60 * 1000), // +14 days
        note: `Auto-generated test project ${i} for performance testing`
      }
    });
  }

  console.log("Seeding complete: 1 Staff, 10 Clients, 50 Projects inserted into Actual DB.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
