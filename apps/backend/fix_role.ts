import { prisma } from './src/config/prisma';
async function run() { 
  await prisma.staff.update({ 
    where: { staffId: 'john.doe' }, 
    data: { role: 'Creative Project Lead' } 
  }); 
  console.log('Upgraded John'); 
} 
run().catch(console.error).finally(() => prisma.$disconnect());
