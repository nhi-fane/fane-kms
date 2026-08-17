const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const projects = await prisma.project.findMany({ where: { clientCode: 'CLI_TEST_1' } });
  console.log(JSON.stringify(projects, null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
