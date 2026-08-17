import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { ledgerService } from '../services/ledger';
import { AuditService } from '../services/auditService';

export const logTimesheet = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskId, hoursLogged, logDate, logSource } = req.body;
    const staffId = req.user!.staffId;

    let finalLogSource = logSource || 'Web';
    if (req.user!.impersonatorRole) {
      finalLogSource += ` (Impersonated by ${req.user!.impersonatorRole})`;
    }

    const ts = await prisma.timesheet.create({
      data: {
        staffId,
        taskId,
        hoursLogged,
        logDate: logDate ? new Date(logDate) : new Date(),
        approvalStatus: 'Pending',
        logSource: finalLogSource
      }
    });

    if (req.user!.impersonatorId) {
      await AuditService.log(
        prisma,
        'TIMESHEET_CREATED',
        req.user!.impersonatorId,
        { taskId, hoursLogged, logDate },
        staffId,
        staffId
      );
    }

    res.status(201).json(ts);
  } catch (error) {
    next(error);
  }
};

export const editTimesheet = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const logId = req.params.logId as string;
    const { hoursLogged, logDate } = req.body;

    const ts = await prisma.timesheet.findUnique({ where: { logId } });
    if (!ts) return res.status(404).json({ error: 'Not found' });

    if (ts.approvalStatus === 'Approved') {
      return res.status(400).json({ error: 'Cannot modify an approved timesheet. Please request Lead to Un-approve first.' });
    }

    const updated = await prisma.timesheet.update({
      where: { logId },
      data: {
        hoursLogged,
        ...(logDate && { logDate: new Date(logDate) })
      }
    });

    if (req.user!.impersonatorId) {
      await AuditService.log(
        prisma,
        'TIMESHEET_UPDATED',
        req.user!.impersonatorId,
        { logId, hoursLogged, logDate },
        ts.staffId,
        ts.staffId
      );
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const approveTimesheet = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const logId = req.params.logId as string;
    const approverId = req.user!.staffId;
    const impersonatorRole = req.user!.impersonatorRole;

    const result = await ledgerService.approveTimesheet(logId, approverId, impersonatorRole);

    if (req.user!.impersonatorId) {
      const ts = await prisma.timesheet.findUnique({ where: { logId } });
      await AuditService.log(
        prisma,
        'TIMESHEET_APPROVED',
        req.user!.impersonatorId,
        { logId },
        ts?.staffId,
        ts?.staffId
      );
    }

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const unapproveTimesheet = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const logId = req.params.logId as string;
    const requestorId = req.user!.staffId;
    const requestorRole = req.user!.role;

    const result = await ledgerService.unapproveTimesheet(logId, requestorId, requestorRole);

    if (req.user!.impersonatorId) {
      const ts = await prisma.timesheet.findUnique({ where: { logId } });
      await AuditService.log(
        prisma,
        'TIMESHEET_UNAPPROVED',
        req.user!.impersonatorId,
        { logId },
        ts?.staffId,
        ts?.staffId
      );
    }

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
