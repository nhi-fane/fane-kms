import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

export const getProjects = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projects = await prisma.project.findMany({ include: { client: true, creativeLead: true } });
    res.json(projects);
  } catch (error) {
    next(error);
  }
};

export const createProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectCode, clientCode, creativeLeadId, name, status, startDate, endDate, note } = req.body;

    if (!projectCode || !clientCode || !creativeLeadId || !name || !startDate) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const project = await prisma.project.create({
      data: {
        projectCode,
        clientCode,
        creativeLeadId,
        name,
        status: status || 'Not_Started',
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        note
      }
    });

    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
};
