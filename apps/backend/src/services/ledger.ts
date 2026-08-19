import { prisma } from '../config/prisma';
import { encrypt, decrypt } from '../utils/crypto';

export const ledgerService = {
  async approveTimesheet(logId: string, approverId: string, impersonatorRole?: string) {
    return prisma.$transaction(async (tx) => {
      const ts = await tx.timesheet.findUnique({
        where: { logId },
        include: { task: { include: { project: true } } }
      });
      if (!ts) throw new Error('Timesheet not found');
      if (ts.approvalStatus === 'Approved') throw new Error('Timesheet is already approved');

      // CPL cannot approve their own timesheet (PRD requirement)
      if (ts.staffId === approverId && ts.task.project.creativeLeadId === approverId) {
        throw new Error('Project Lead cannot approve their own timesheet. Requires Creative Director.');
      }

      // Snapshot cost securely
      const salaryRecord = await tx.staffSalary.findUnique({
        where: { staffId: ts.staffId }
      });
      
      const cost = salaryRecord && salaryRecord.encryptedCostPerHour 
        ? parseFloat(decrypt(salaryRecord.encryptedCostPerHour)) 
        : 0;
      
      const logSource = impersonatorRole 
        ? `${ts.logSource} (Impersonated by ${impersonatorRole})`
        : ts.logSource;

      // Update timesheet
      const updatedTs = await tx.timesheet.update({
        where: { logId },
        data: {
          approvalStatus: 'Approved',
          approvedById: approverId,
          logSource
        }
      });

      // Insert secure InternalCostTransaction
      if (ts.hoursLogged > 0) {
        const amount = ts.hoursLogged * cost;
        const encryptedRate = encrypt(cost.toString());
        const encryptedAmount = encrypt(amount.toString());

        await tx.internalCostTransaction.upsert({
          where: { timesheetId: logId },
          create: {
            projectCode: ts.task.projectCode,
            timesheetId: logId,
            encryptedHistoricalRate: encryptedRate,
            encryptedAmount: encryptedAmount,
            transactionDate: ts.logDate
          },
          update: {
            encryptedHistoricalRate: encryptedRate,
            encryptedAmount: encryptedAmount
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
          approvedById: null
        }
      });

      // Delete the associated secure transaction to ensure P&L accuracy
      await tx.internalCostTransaction.deleteMany({
        where: { timesheetId: logId }
      });

      return updatedTs;
    });
  }
};

