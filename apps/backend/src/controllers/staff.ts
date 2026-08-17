import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

export const getStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staff = await prisma.staff.findMany({ omit: { password: true } });
    res.json(staff);
  } catch (error) {
    next(error);
  }
};
