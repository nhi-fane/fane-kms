import { PrismaClient } from '@prisma/client';
import { triggerDebouncedBackup } from '../utils/debouncer';

const basePrisma = new PrismaClient({});

basePrisma.$use(async (params, next) => {
  const result = await next(params);
  
  const mutatingActions = ['create', 'update', 'delete', 'createMany', 'updateMany', 'deleteMany', 'upsert'];
  if (mutatingActions.includes(params.action)) {
    triggerDebouncedBackup();
  }
  
  return result;
});

export const prisma = basePrisma;