import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  staffId: string;
  role: string;
  isReadOnly?: boolean;
  impersonatorRole?: string;
  impersonatorId?: string;
  permissions?: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;

      const staff = await prisma.staff.findUnique({
        where: { staffId: decoded.staffId },
        select: {
          isActive: true,
          tokenVersion: true,
          permissions: {
            where: { isGranted: true },
            select: { permissionCode: true }
          },
          roleData: {
            select: {
              permissions: { select: { permissionCode: true } }
            }
          }
        }
      });

      if (!staff || !staff.isActive) {
        res.status(401).json({ error: 'Unauthorized: User not found or inactive' });
        return;
      }

      if (decoded.tokenVersion !== undefined && staff.tokenVersion !== decoded.tokenVersion) {
        res.status(401).json({ error: 'Unauthorized: Token revoked' });
        return;
      }

      const rolePerms = staff.roleData?.permissions.map((p: any) => p.permissionCode) || [];
      const staffPerms = staff.permissions.map((p: any) => p.permissionCode) || [];
      const permissionsSet = new Set([...rolePerms, ...staffPerms]);

      req.user = {
        staffId: decoded.staffId,
        role: decoded.role,
        isReadOnly: decoded.isReadOnly || false,
        impersonatorRole: decoded.impersonatorRole,
        impersonatorId: decoded.impersonatorId,
        permissions: Array.from(permissionsSet)
      };

      if (req.user.impersonatorId && req.method === 'DELETE') {
        res.status(403).json({ error: 'Forbidden: Impersonators cannot perform DELETE operations' });
        return;
      }

      next();
      return;
    }

    res.status(401).json({ error: 'Unauthorized: Missing or Invalid Token' });
  } catch (error) {
    res.status(401).json({ error: 'Invalid or Expired Token' });
  }
};

export const requireWriteAccess = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.isReadOnly) {
    return res.status(403).json({ error: 'Forbidden: Read-Only (View As) mode active' });
  }
  next();
};

export const censorSensitiveData = (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json;
  res.json = function (body) {
    if (!req.user || !body) return originalJson.call(this, body);

    const hasPermission = req.user.permissions?.includes('pnl:view_sensitive') || false;

    if (!hasPermission) {
      const censor = (obj: any) => {
        if (Array.isArray(obj)) {
          obj.forEach(censor);
        } else if (obj !== null && typeof obj === 'object') {
          const isOwner = obj.staffId === req.user?.staffId;

          if (!isOwner) {
            if ('costPerHour' in obj) obj.costPerHour = 'Censored';
            if ('amount' in obj && obj.category === 'Internal_Cost') {
              obj.amount = 'Censored';
              obj.staffId = 'Censored';
              obj.referenceId = 'Censored';
              obj.timesheetId = 'Censored';
            }
          }
          Object.values(obj).forEach(censor);
        }
      };
      censor(body);
    }
    return originalJson.call(this, body);
  };
  next();
};

export const checkPermission = (requiredPermission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized: User not found in request' });
      }

      const { staffId, role } = req.user;

      // 1. Check if there's an explicit Staff override
      const staffPerm = await prisma.staffPermission.findUnique({
        where: {
          staffId_permissionCode: {
            staffId,
            permissionCode: requiredPermission
          }
        }
      });

      if (staffPerm) {
        if (staffPerm.isGranted) return next();
        return res.status(403).json({ error: `Forbidden: Permission ${requiredPermission} explicitly revoked` });
      }

      // 2. Fallback to default Role permission
      const rolePerm = await prisma.rolePermission.findUnique({
        where: {
          roleCode_permissionCode: {
            roleCode: role,
            permissionCode: requiredPermission
          }
        }
      });

      if (rolePerm) {
        return next();
      }

      return res.status(403).json({ error: `Forbidden: Missing permission ${requiredPermission}` });
    } catch (error) {
      console.error('checkPermission error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  };
};
