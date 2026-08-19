import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Reverting all passwords to plain text FanE@2026...');
  
  const result = await prisma.staff.updateMany({
    data: {
      password: 'FanE@2026',
      requirePasswordChange: true
    }
  });

  console.log(`Successfully updated ${result.count} staff records.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
