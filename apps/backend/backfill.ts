import { prisma } from './src/config/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  const staffList = await prisma.staff.findMany();
  for (const staff of staffList) {
    const defaultEmail = `${staff.staffId.toLowerCase()}@fantasticeggs.vn`;
    const hashedPassword = await bcrypt.hash('fane123', 10);
    
    await prisma.staff.update({
      where: { staffId: staff.staffId },
      data: {
        email: defaultEmail,
        password: hashedPassword
      }
    });
    console.log(`Updated staff ${staff.staffId} -> ${defaultEmail}`);
  }
  console.log('Backfill complete!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
