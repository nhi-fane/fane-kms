import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import bcrypt from 'bcryptjs';
import { AuditService } from '../services/auditService';

// Utility to parse Date consistently to UTC midnight if it's a YYYY-MM-DD string
const parseDateUTC = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  // If the format is strictly YYYY-MM-DD, append T00:00:00Z to enforce UTC
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(`${dateStr}T00:00:00Z`);
  }
  return new Date(dateStr);
};

export const bulkSave = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { clients = {}, projects = {} } = req.body;
    const { added: addedClients = [], updated: updatedClients = [], deleted: deletedClientCodes = [] } = clients;
    const { added: addedProjects = [], updated: updatedProjects = [], deleted: deletedProjectCodes = [] } = projects;

    // Validation for Hard Delete
    if (deletedClientCodes.length > 0) {
      const blockingProjects = await prisma.project.findMany({
        where: { 
          clientCode: { in: deletedClientCodes },
          projectCode: { notIn: deletedProjectCodes }
        },
        select: { clientCode: true }
      });
      if (blockingProjects.length > 0) {
        const invalidCodes = Array.from(new Set(blockingProjects.map(p => p.clientCode)));
        const fieldErrors = invalidCodes.map(c => ({ uiKey: c, field: 'delete', message: 'Client still has active projects.' }));
        return res.status(400).json({ 
          error: "Không thể xóa Client: Vẫn còn Project đang hoạt động.", 
          fieldErrors 
        });
      }
    }

    if (deletedProjectCodes.length > 0) {
      const blockingTimesheets = await prisma.timesheet.findMany({
        where: { task: { projectCode: { in: deletedProjectCodes } } },
        select: { task: { select: { projectCode: true } } }
      });
      const blockingPnls = await prisma.pnlTransaction.findMany({
        where: { projectCode: { in: deletedProjectCodes } },
        select: { projectCode: true }
      });

      const invalidCodes = new Set([
        ...blockingTimesheets.map(t => t.task.projectCode),
        ...blockingPnls.map(p => p.projectCode)
      ]);

      if (invalidCodes.size > 0) {
        const fieldErrors = Array.from(invalidCodes).map(c => ({ uiKey: c, field: 'delete', message: 'Project already has Timesheet or P&L data.' }));
        return res.status(400).json({ 
          error: "Không thể xóa Project: Đã phát sinh dữ liệu (Timesheet/P&L).", 
          fieldErrors 
        });
      }
    }

    // Execute all operations in a single transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete Projects (must delete tasks first if they exist, but we assume no tasks if deleting, or we can just delete tasks)
      if (deletedProjectCodes.length > 0) {
        await tx.taskAssignee.deleteMany({
          where: { task: { projectCode: { in: deletedProjectCodes } } }
        });
        await tx.task.deleteMany({
          where: { projectCode: { in: deletedProjectCodes } }
        });
        await tx.project.deleteMany({
          where: { projectCode: { in: deletedProjectCodes } }
        });
      }

      // 2. Delete Clients
      if (deletedClientCodes.length > 0) {
        await tx.client.deleteMany({
          where: { clientCode: { in: deletedClientCodes } }
        });
      }

      // 3. Add Clients
      for (const client of addedClients) {
        await tx.client.create({
          data: {
            clientCode: client.clientCode,
            name: client.name,
            legalName: client.legalName || null,
            industry: client.industry || null
          }
        });
      }

      // 4. Update Clients
      for (const client of updatedClients) {
        const existing = await tx.client.findUnique({ where: { clientCode: client.clientCode } });
        if (!existing || existing.version !== client.version) {
          throw new Error(`CONCURRENCY_CONFLICT: Client ${client.clientCode} was modified by another user.`);
        }
        await tx.client.update({
          where: { clientCode: client.clientCode },
          data: {
            name: client.name,
            legalName: client.legalName,
            industry: client.industry,
            version: existing.version + 1
          }
        });
      }

      // 5. Add Projects
      for (const project of addedProjects) {
        const startDate = parseDateUTC(project.startDate) || new Date();
        let endDate = parseDateUTC(project.endDate);

        // Auto-calc End Date (+3 months) and skip weekends if blank
        if (!endDate) {
          endDate = new Date(startDate);
          endDate.setUTCMonth(endDate.getUTCMonth() + 3);
          if (endDate.getUTCDay() === 6) endDate.setUTCDate(endDate.getUTCDate() + 2); // Saturday
          else if (endDate.getUTCDay() === 0) endDate.setUTCDate(endDate.getUTCDate() + 1); // Sunday
        }

        await tx.project.create({
          data: {
            projectCode: project.projectCode,
            clientCode: project.clientCode,
            creativeLeadId: project.creativeLeadId,
            name: project.name,
            status: project.status || 'Not Started',
            startDate,
            endDate,
            note: project.note || null
          }
        });
      }

      // 6. Update Projects
      for (const project of updatedProjects) {
        const existing = await tx.project.findUnique({ where: { projectCode: project.projectCode } });
        if (!existing || existing.version !== project.version) {
          throw new Error(`CONCURRENCY_CONFLICT: Project ${project.projectCode} was modified by another user.`);
        }
        
        const startDate = parseDateUTC(project.startDate) || new Date();
        let endDate = parseDateUTC(project.endDate);

        // Auto-calc End Date (+3 months) and skip weekends if blank
        if (!endDate) {
          endDate = new Date(startDate);
          endDate.setUTCMonth(endDate.getUTCMonth() + 3);
          if (endDate.getUTCDay() === 6) endDate.setUTCDate(endDate.getUTCDate() + 2); // Saturday
          else if (endDate.getUTCDay() === 0) endDate.setUTCDate(endDate.getUTCDate() + 1); // Sunday
        }

        await tx.project.update({
          where: { projectCode: project.projectCode },
          data: {
            clientCode: project.clientCode,
            creativeLeadId: project.creativeLeadId,
            name: project.name,
            status: project.status,
            startDate,
            endDate,
            note: project.note,
            version: existing.version + 1
          }
        });
      }
    });

    res.status(200).json({ message: "Successfully saved changes" });
  } catch (error: any) {
    if (error.message && error.message.includes('CONCURRENCY_CONFLICT')) {
      const parts = error.message.split(' ');
      const code = parts[2]; // e.g. "CONCURRENCY_CONFLICT: Client C001 was..."
      return res.status(409).json({ 
        error: "Dữ liệu đã bị thay đổi bởi người khác. Vui lòng tải lại trang để tránh ghi đè.",
        fieldErrors: [{ uiKey: code, field: 'version', message: 'Conflict: Dữ liệu cũ' }]
      });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ error: "Lỗi trùng lặp dữ liệu (Mã Project/Client đã tồn tại)." });
    }
    console.error('[BulkSave Error]', error);
    next(error);
  }
};

export const adminResetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = req.user?.staffId;
    const targetStaffId = req.params.id as string;

    if (!adminId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!targetStaffId) {
      res.status(400).json({ error: 'Missing target staff ID' });
      return;
    }

    const targetStaff = await prisma.staff.findUnique({ where: { staffId: targetStaffId } });
    if (!targetStaff) {
      res.status(404).json({ error: 'Staff not found' });
      return;
    }

    const hashedDefault = await bcrypt.hash('FanE@2026', 10);

    await prisma.staff.update({
      where: { staffId: targetStaffId },
      data: {
        password: hashedDefault,
        requirePasswordChange: true,
        tokenVersion: { increment: 1 }
      }
    });

    await AuditService.log(
      prisma,
      'ADMIN_RESET_PASSWORD',
      adminId,
      { targetStaffId },
      targetStaffId,
      targetStaffId
    );

    res.json({ message: 'Mật khẩu đã được khôi phục về mặc định (FanE@2026). User sẽ bị đăng xuất khỏi mọi thiết bị.' });
  } catch (error: any) {
    console.error('[Admin Reset Password Error]', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
};

export const bulkSaveStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userRole = req.user?.role;
    if (!userRole || !['CEO', 'BOD', 'PO'].includes(userRole)) {
      return res.status(403).json({ error: 'Forbidden: Only CEO, BOD, and PO can manage staff.' });
    }

    const { staff = {} } = req.body;
    const { added = [], updated = [] } = staff;

    await prisma.$transaction(async (tx) => {
      // 0. Ensure roles exist
      const incomingRoles = new Set<string>();
      for (const s of added) if (s.role) incomingRoles.add(s.role.trim());
      for (const s of updated) if (s.role) incomingRoles.add(s.role.trim());
      
      for (const roleCode of incomingRoles) {
        const existingRole = await tx.role.findUnique({ where: { code: roleCode } });
        if (!existingRole) {
          await tx.role.create({
            data: {
              code: roleCode,
              name: roleCode
            }
          });
        }
      }

      // 1. Add Staff
      for (const s of added) {
        const hashedDefault = await bcrypt.hash('FanE@2026', 10);
        await tx.staff.create({
          data: {
            staffId: s.staffId,
            fullName: s.fullName,
            firstName: s.fullName.split(' ').pop() || s.fullName,
            role: s.role,
            team: s.team || 'Creative',
            level: s.level || 1,
            costPerHour: s.costPerHour || 0, // Frontend won't send this, but DB requires it.
            standardHoursPerDay: s.standardHoursPerDay || 8,
            email: s.email || '',
            password: hashedDefault,
            requirePasswordChange: true,
            isActive: s.isActive ?? true
          }
        });
      }

      // 2. Update Staff
      for (const s of updated) {
        // Find existing to preserve costPerHour which isn't editable
        const existing = await tx.staff.findUnique({ where: { staffId: s.staffId } });
        if (!existing) {
          throw new Error(`Staff ${s.staffId} not found.`);
        }
        await tx.staff.update({
          where: { staffId: s.staffId },
          data: {
            fullName: s.fullName !== undefined ? s.fullName : existing.fullName,
            firstName: s.fullName ? (s.fullName.split(' ').pop() || s.fullName) : existing.firstName,
            role: s.role !== undefined ? s.role : existing.role,
            team: s.team !== undefined ? s.team : existing.team,
            level: s.level !== undefined ? s.level : existing.level,
            standardHoursPerDay: s.standardHoursPerDay !== undefined ? s.standardHoursPerDay : existing.standardHoursPerDay,
            email: s.email !== undefined ? s.email : existing.email,
            isActive: s.isActive !== undefined ? s.isActive : existing.isActive
          }
        });
      }
    });

    res.status(200).json({ message: "Staff saved successfully" });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: "Lỗi trùng lặp dữ liệu (Mã Nhân viên hoặc Email đã tồn tại)." });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({ error: "Chức danh (Role) không hợp lệ. Vui lòng chọn một chức danh có sẵn trong hệ thống." });
    }
    console.error('[BulkSave Staff Error]', error);
    next(error);
  }
};
