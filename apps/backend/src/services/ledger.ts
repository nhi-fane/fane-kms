import { prisma } from '../config/prisma';

export const ledgerService = {
  async approveTimesheet(logId: string, approverId: string, impersonatorRole?: string) {
    return prisma.$transaction(async (tx) => {
      const ts = await tx.timesheet.findUnique({
        where: { logId },
        include: { staff: true, task: { include: { project: true } } }
      });
      if (!ts) throw new Error('Timesheet not found');
      if (ts.approvalStatus === 'Approved') throw new Error('Timesheet is already approved');

      // CPL cannot approve their own timesheet (PRD requirement)
      if (ts.staffId === approverId && ts.task.project.creativeLeadId === approverId) {
        throw new Error('Project Lead cannot approve their own timesheet. Requires Creative Director.');
      }

      // Snapshot cost
      const cost = ts.staff.costPerHour;
      
      const logSource = impersonatorRole 
        ? `${ts.logSource} (Impersonated by ${impersonatorRole})`
        : ts.logSource;

      // Update timesheet
      const updatedTs = await tx.timesheet.update({
        where: { logId },
        data: {
          approvalStatus: 'Approved',
          approvedById: approverId,
          historicalCostPerHour: cost,
          logSource
        }
      });

      // Insert PnlTransaction for internal cost
      if (ts.hoursLogged > 0) {
        await tx.pnlTransaction.upsert({
          where: { timesheetId: logId },
          create: {
            projectCode: ts.task.projectCode,
            category: 'Internal_Cost',
            staffId: ts.staffId,
            timesheetId: logId,
            amount: ts.hoursLogged * cost,
            transactionDate: ts.logDate,
            loggedBy: 'System'
          },
          update: {
            amount: ts.hoursLogged * cost,
          }
        });
      }
      return updatedTs;
    });
  },

  async unapproveTimesheet(logId: string, requestorId: string, requestorRole: string) {
    return prisma.$transaction(async (tx) => {
      const ts = await tx.timesheet.findUnique({ 
        where: { logId },
        include: { task: { include: { project: true } } }
      });
      if (!ts) throw new Error('Timesheet not found');

      const isBOD = ['BOD', 'CEO', 'Creative Director'].includes(requestorRole);
      const isLead = ts.task.project.creativeLeadId === requestorId;
      
      if (!isBOD && !isLead) {
        throw new Error('Forbidden: Only BOD, Creative Director or the Project Lead can unapprove timesheets.');
      }

      const updatedTs = await tx.timesheet.update({
        where: { logId },
        data: {
          approvalStatus: 'Pending',
          approvedById: null,
          historicalCostPerHour: null
        }
      });

      // Delete the associated PnlTransaction to ensure P&L accuracy
      await tx.pnlTransaction.deleteMany({
        where: { timesheetId: logId }
      });

      return updatedTs;
    });
  }
};
