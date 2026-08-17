import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

export const updateTaskAssignee = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = req.params.taskId as string;
    const staffId = req.user!.staffId;
    const { isDone } = req.body;

    const updatedAssignee = await prisma.taskAssignee.update({
      where: { taskId_staffId: { taskId, staffId } },
      data: { isDone, completedAt: isDone ? new Date() : null },
      include: { task: true }
    });


    const allAssignees = await prisma.taskAssignee.findMany({
      where: { taskId }
    });

    const allDone = allAssignees.every(a => a.isDone === true);

    if (allDone && (updatedAssignee as any).task.status !== 'Completed') {
      await prisma.task.update({
        where: { taskId: taskId },
        data: { status: 'Completed' }
      });
      console.log(`[Task] Auto-completed Task ${taskId}`);
    } else if (!allDone && (updatedAssignee as any).task.status === 'Completed') {
      await prisma.task.update({
        where: { taskId: taskId },
        data: { status: 'In_Progress' }
      });
    }

    res.json(updatedAssignee);
  } catch (error) {
    next(error);
  }
};

export const createTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { parentTaskId, projectCode, name, description, startDate, deadline, assigneeIds } = req.body;

    if (!projectCode || !name || !startDate || !deadline || !assigneeIds || !Array.isArray(assigneeIds)) {
      return res.status(400).json({ error: "Missing required fields or invalid assigneeIds" });
    }

    const currentStaffId = req.user!.staffId;
    const currentStaff = await prisma.staff.findUnique({ where: { staffId: currentStaffId } });

    if (!currentStaff) {
      return res.status(401).json({ error: "User not found" });
    }

    // Assignee Validation Rule 1, 2, 3
    if (currentStaff.role !== 'Account') {
      const assignees = await prisma.staff.findMany({
        where: { staffId: { in: assigneeIds } }
      });

      const invalidAssignees = assignees.filter(
        a => a.staffId !== currentStaffId && a.level < currentStaff.level
      );

      if (invalidAssignees.length > 0) {
        return res.status(403).json({ error: "Bạn không có quyền assign task cho cấp bậc này" });
      }
    }

    const task = await prisma.$transaction(async (tx) => {
      // Create the main task
      const newTask = await tx.task.create({
        data: {
          parentTaskId: parentTaskId || null,
          projectCode,
          name,
          description,
          startDate: new Date(startDate),
          deadline: new Date(deadline),
          status: 'In_Progress'
        }
      });

      // Assign the task to multiple staff
      if (assigneeIds.length > 0) {
        const assigneesData = assigneeIds.map(staffId => ({
          taskId: newTask.taskId,
          staffId: staffId,
          isDone: false
        }));
        await tx.taskAssignee.createMany({
          data: assigneesData
        });
      }

      return tx.task.findUnique({
        where: { taskId: newTask.taskId },
        include: { assignees: true }
      });
    });

    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
};
