import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'nhitv@fantasticeggs.vn';
  const staff = await prisma.staff.findUnique({
    where: { email }
  });
  
  console.log('Staff Details:', staff);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
