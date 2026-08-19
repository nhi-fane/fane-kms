const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const count = await prisma.staff.count();
  console.log('Staff count in Supabase:', count);
}
main().finally(() => prisma.$disconnect());
