import { prisma } from './src/config/prisma';

async function main() {
  const staff = await prisma.staff.findMany({
    select: { staffId: true, fullName: true, role: true, email: true }
  });
  console.table(staff);
}

main().catch(console.error).finally(() => prisma.$disconnect());
