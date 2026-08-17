import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting password hashing migration...');
  const staffs = await prisma.staff.findMany();
  let updatedCount = 0;

  for (const staff of staffs) {
    // If the password is not already a bcrypt hash (bcrypt hashes usually start with $2a$, $2b$, or $2y$)
    if (!staff.password.startsWith('$2a$') && !staff.password.startsWith('$2b$')) {
      const plainPassword = staff.password || 'FanE@2026';
      const hashedPassword = await bcrypt.hash(plainPassword, 10);
      
      await prisma.staff.update({
        where: { staffId: staff.staffId },
        data: { password: hashedPassword },
      });
      updatedCount++;
      console.log(`Updated password for staff: ${staff.staffId}`);
    }
  }

  console.log(`Migration complete. Updated ${updatedCount} staff records.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
