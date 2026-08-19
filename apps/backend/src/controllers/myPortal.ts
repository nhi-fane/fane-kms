import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { decrypt } from '../utils/crypto';

export const getMyPortalData = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user || !user.staffId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const isBOD = ['BOD', 'CEO'].includes(user.role || '');

    // 1. All Staff (for assignee dropdown)
    const staff = await prisma.staff.findMany({
      select: {
        staffId: true, fullName: true, firstName: true, role: true, level: true,
        standardHoursPerDay: true, telegramId: true,
        email: true, isActive: true, createdAt: true, updatedAt: true, salary: true
      }
    });
    const maskedStaff = staff.map(s => {
      let cost = 0;
      if (isBOD && s.salary?.encryptedCostPerHour) {
        try {
          cost = parseFloat(decrypt(s.salary.encryptedCostPerHour));
        } catch(e) { cost = 0; }
      }
      const { salary, ...rest } = s;
      return {
        ...rest,
        costPerHour: cost
      };
    });

    // 2. All Active Projects (for creating tasks)
    const projects = await prisma.project.findMany({
      where: { isDeleted: false, status: { not: 'Closed' } },
      include: { creativeLead: true }
    });

    // 3. All Tasks (since user wants to toggle "All projects" in timeline)
    const tasks = await prisma.task.findMany({
      where: { isDeleted: false },
      include: { assignees: true }
    });

    // 4. User's Timesheets
    const timesheets = await prisma.timesheet.findMany({
      where: { staffId: user.staffId }
    });

    // 5. User's Leaves
    const leaves = await prisma.staffLeaveLog.findMany({
      where: { staffId: user.staffId }
    });

    // 6. Holidays
    const holidays = await prisma.companyHoliday.findMany();

    res.json({ staff: maskedStaff, projects, tasks, timesheets, leaves, holidays });
  } catch (error) {
    next(error);
  }
};
