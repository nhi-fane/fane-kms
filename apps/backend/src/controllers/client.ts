import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

export const getClients = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clients = await prisma.client.findMany();
    res.json(clients);
  } catch (error) {
    next(error);
  }
};
