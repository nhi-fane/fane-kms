import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

export const getDashboardData = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userRole = req.user?.role || '';
    const isBOD = ['BOD', 'CEO'].includes(userRole);
    const isAccountant = userRole === 'Kế toán';

    // Fetch staff but exclude password
    const staff = await prisma.staff.findMany({
      select: {
        staffId: true, fullName: true, firstName: true, role: true, level: true,
        costPerHour: true, standardHoursPerDay: true, telegramId: true,
        email: true, isActive: true, team: true, createdAt: true, updatedAt: true
      }
    });

    // Mask costPerHour for non-BOD
    const maskedStaff = staff.map(s => ({
      ...s,
      costPerHour: isBOD ? s.costPerHour : 0
    }));

    const projects = await prisma.project.findMany({ include: { creativeLead: true } });
    const tasks = await prisma.task.findMany({ include: { assignees: true } });
    const clients = await prisma.client.findMany();
    
    // Hide timesheets entirely for Kế toán
    const timesheets = isAccountant ? [] : await prisma.timesheet.findMany();
    
    const leaves = await prisma.staffLeaveLog.findMany();
    const holidays = await prisma.companyHoliday.findMany();
    
    res.json({ staff: maskedStaff, projects, tasks, timesheets, leaves, holidays, clients });
  } catch (error) {
    next(error);
  }
};
