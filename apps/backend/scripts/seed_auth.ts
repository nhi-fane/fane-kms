import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const permissions = [
  // 1. Client Management
  { code: 'client:create', name: 'Create Client', category: 'Client Management' },
  { code: 'client:edit', name: 'Edit Client', category: 'Client Management' },
  { code: 'client:archive', name: 'Archive Client', category: 'Client Management' },
  { code: 'client:delete', name: 'Delete Client', category: 'Client Management' },
  
  // 2. Project Management
  { code: 'project:create', name: 'Create Project', category: 'Project Management' },
  { code: 'project:edit', name: 'Edit Project', category: 'Project Management' },
  { code: 'project:archive', name: 'Archive Project', category: 'Project Management' },
  { code: 'project:delete', name: 'Delete Project', category: 'Project Management' },
  
  // 3. Task Assignment
  { code: 'task:assign_self', name: 'Assign Self', category: 'Task Assignment' },
  { code: 'task:assign_lower_level', name: 'Assign to Lower Level', category: 'Task Assignment' },
  { code: 'task:assign_any', name: 'Assign to Anyone', category: 'Task Assignment' },
  
  // 4. Task Modification
  { code: 'task:edit_project_only', name: 'Edit Project Tasks', category: 'Task Modification' },
  { code: 'task:edit_any', name: 'Edit Any Task', category: 'Task Modification' },
  { code: 'task:delete_project_only', name: 'Delete Project Tasks', category: 'Task Modification' },
  { code: 'task:delete_any', name: 'Delete Any Task', category: 'Task Modification' },
  
  // 5. Timesheet & Capacity
  { code: 'timesheet:log', name: 'Log Timesheet', category: 'Timesheet & Capacity' },
  { code: 'timesheet:approve_project_only', name: 'Approve Project Timesheets', category: 'Timesheet & Capacity' },
  { code: 'timesheet:approve_any', name: 'Approve Any Timesheet', category: 'Timesheet & Capacity' },
  { code: 'timesheet:edit_approved', name: 'Edit Approved Timesheet', category: 'Timesheet & Capacity' },
  { code: 'leave:approve', name: 'Approve Leave Requests', category: 'Timesheet & Capacity' },
  
  // 6. Financial (P&L)
  { code: 'pnl:view_full', name: 'View Full P&L', category: 'Financial (P&L)' },
  { code: 'pnl:view_masked', name: 'View Masked P&L', category: 'Financial (P&L)' },
  { code: 'pnl:manage_external', name: 'Manage External Cost', category: 'Financial (P&L)' },
  { code: 'vendor:manage', name: 'Manage Vendors', category: 'Financial (P&L)' },
  
  // 7. System & Security
  { code: 'system:impersonate', name: 'Impersonate Users', category: 'System & Security' },
  { code: 'system:grant_permission', name: 'Grant/Revoke Permissions', category: 'System & Security' }
];

const roles = [
  { code: 'CEO', name: 'CEO', description: 'Chief Executive Officer' },
  { code: 'BOD', name: 'BOD', description: 'Board of Directors' },
  { code: 'Account', name: 'Account', description: 'Account Executive / Manager' },
  { code: 'Creative Director', name: 'Creative Director', description: 'Head of Creative' },
  { code: 'Creative Lead', name: 'Creative Project Lead', description: 'Creative Project Leader' },
  { code: 'Creative Team', name: 'Creative Team Member', description: 'Designer, Copywriter, etc.' },
  { code: 'PO', name: 'Product Owner', description: 'System Administrator / PO' },
  { code: 'Kế toán', name: 'Kế toán', description: 'Accountant' }
];

// Mapping based on PRD
const rolePermissions: { roleCode: string, permissions: string[] }[] = [
  {
    roleCode: 'CEO',
    permissions: [
      'pnl:view_full', 'system:grant_permission', 'system:impersonate'
    ]
  },
  {
    roleCode: 'BOD',
    permissions: [
      'pnl:view_full', 'system:grant_permission', 'system:impersonate'
    ]
  },
  {
    roleCode: 'Account',
    permissions: [
      'client:create', 'client:edit', 'client:archive', 'client:delete',
      'project:create', 'project:edit', 'project:archive', 'project:delete',
      'task:assign_any',
      'pnl:view_full', 'pnl:manage_external', 'vendor:manage'
    ]
  },
  {
    roleCode: 'Creative Director',
    permissions: [
      'task:assign_self', 'task:assign_lower_level',
      'task:edit_any', 'task:delete_any',
      'timesheet:log', 'timesheet:approve_any', 'timesheet:edit_approved', 'leave:approve'
    ]
  },
  {
    roleCode: 'Creative Lead',
    permissions: [
      'task:assign_self', 'task:assign_lower_level',
      'task:edit_project_only', 'task:delete_project_only',
      'timesheet:log', 'timesheet:approve_project_only', 'leave:approve'
    ]
  },
  {
    roleCode: 'Creative Team',
    permissions: [
      'task:assign_self', 'task:assign_lower_level',
      'timesheet:log'
    ]
  },
  {
    roleCode: 'PO',
    permissions: [
      'system:impersonate'
    ]
  },
  {
    roleCode: 'Kế toán',
    permissions: [
      'pnl:view_masked', 'pnl:manage_external', 'vendor:manage'
    ]
  }
];

async function main() {
  console.log('Seeding Permissions...');
  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: perm,
      create: perm,
    });
  }

  console.log('Seeding Roles...');
  for (const role of roles) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: role,
      create: role,
    });
  }

  console.log('Seeding RolePermissions...');
  for (const mapping of rolePermissions) {
    for (const permCode of mapping.permissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleCode_permissionCode: {
            roleCode: mapping.roleCode,
            permissionCode: permCode
          }
        },
        update: {},
        create: {
          roleCode: mapping.roleCode,
          permissionCode: permCode
        }
      });
    }
  }

  console.log('Seed completed successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
