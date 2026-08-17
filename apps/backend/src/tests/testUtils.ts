import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export const getTestToken = (staffId: string, role: string, isReadOnly: boolean = false, impersonatorRole?: string) => {
  return jwt.sign({ staffId, role, isReadOnly, impersonatorRole }, JWT_SECRET, { expiresIn: '1h' });
};

export const setupTestDB = async () => {
  await prisma.staff.upsert({
    where: { staffId: 'TEST_CEO' },
    update: { role: 'CEO', level: 1 },
    create: {
      staffId: 'TEST_CEO',
      fullName: 'Test CEO',
      firstName: 'CEO',
      costPerHour: 100,
      telegramId: 'test_ceo',
      email: 'ceo@test.com',
      role: 'CEO',
      password: 'hashed_password', // not used in tests
      level: 1
    }
  });

  await prisma.staff.upsert({
    where: { staffId: 'TEST_ACCOUNT' },
    update: { role: 'Account', level: 2 },
    create: {
      staffId: 'TEST_ACCOUNT',
      fullName: 'Test Account',
      firstName: 'Account',
      costPerHour: 50,
      telegramId: 'test_account',
      email: 'account@test.com',
      role: 'Account',
      password: 'hashed_password',
      level: 2
    }
  });

  // Create Roles
  await prisma.role.upsert({ where: { code: 'CEO' }, update: {}, create: { code: 'CEO', name: 'CEO' } });
  await prisma.role.upsert({ where: { code: 'Account' }, update: {}, create: { code: 'Account', name: 'Account' } });

  // Create Permissions
  await prisma.permission.upsert({ where: { code: 'system:grant_permission' }, update: {}, create: { code: 'system:grant_permission', name: 'Grant Permission', category: 'System' } });
  await prisma.permission.upsert({ where: { code: 'system:impersonate' }, update: {}, create: { code: 'system:impersonate', name: 'Impersonate', category: 'System' } });

  // Ensure RolePermissions exist (CEO has system:grant_permission and system:impersonate)
  await prisma.rolePermission.upsert({
    where: { roleCode_permissionCode: { roleCode: 'CEO', permissionCode: 'system:grant_permission' } },
    update: {},
    create: { roleCode: 'CEO', permissionCode: 'system:grant_permission' }
  });
  await prisma.rolePermission.upsert({
    where: { roleCode_permissionCode: { roleCode: 'CEO', permissionCode: 'system:impersonate' } },
    update: {},
    create: { roleCode: 'CEO', permissionCode: 'system:impersonate' }
  });
};

export const teardownTestDB = async () => {
  // Clear overrides and test users
  await prisma.timesheet.deleteMany({
    where: { staffId: { in: ['TEST_CEO', 'TEST_ACCOUNT'] } }
  });

  await prisma.task.deleteMany({
    where: { taskId: 'test-task' }
  });

  await prisma.project.deleteMany({
    where: { projectCode: 'TEST_PROJ' }
  });

  await prisma.client.deleteMany({
    where: { clientCode: 'TEST_CLIENT' }
  });

  await prisma.staffPermission.deleteMany({
    where: { staffId: { in: ['TEST_CEO', 'TEST_ACCOUNT'] } }
  });
  
  await prisma.auditLog.deleteMany({
    where: { targetStaffId: { in: ['TEST_CEO', 'TEST_ACCOUNT'] } }
  });

  await prisma.staff.deleteMany({
    where: { staffId: { in: ['TEST_CEO', 'TEST_ACCOUNT'] } }
  });
};
