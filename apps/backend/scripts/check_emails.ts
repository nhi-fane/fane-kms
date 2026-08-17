import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.staff.findMany().then(s => console.log(s.map(x => x.email))).finally(() => prisma.$disconnect());
