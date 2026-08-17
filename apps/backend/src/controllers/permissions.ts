import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { AuditService } from '../services/auditService';

export const getPermissionMatrix = async (req: Request, res: Response) => {
  try {
    const permissions = await prisma.permission.findMany();
    const roles = await prisma.role.findMany({
      include: { permissions: true }
    });

    // Get all staff to display in columns
    const staff = await prisma.staff.findMany({
      omit: { password: true },
      include: {
        permissions: true, // Staff-specific overrides
      }
    });

    const roleMap = new Map(roles.map(r => [r.code, r]));

    // Compute the matrix
    // Row: Permission
    // Col: Staff
    // Value: { granted: boolean, isOverride: boolean }

    const matrixData = permissions.map(perm => {
      const staffStatus: Record<string, { granted: boolean, isOverride: boolean }> = {};

      staff.forEach(person => {
        // 1. Check override
        const override = person.permissions.find(p => p.permissionCode === perm.code);
        if (override) {
          staffStatus[person.staffId] = {
            granted: override.isGranted,
            isOverride: true
          };
          return;
        }

        // 2. Check default role
        const personRole = roleMap.get(person.role);
        const hasDefault = personRole?.permissions.some(p => p.permissionCode === perm.code) || false;

        staffStatus[person.staffId] = {
          granted: hasDefault,
          isOverride: false
        };
      });

      return {
        permission: perm,
        staffStatus
      };
    });

    res.json({
      staff: staff.map(s => ({ staffId: s.staffId, fullName: s.fullName, role: s.role })),
      matrix: matrixData
    });

  } catch (error) {
    console.error('getPermissionMatrix error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const overridePermission = async (req: Request, res: Response) => {
  try {
    const { targetStaffId, permissionCode, isGranted } = req.body;
    const performerId = req.user?.staffId;
    const impersonatorId = req.user?.impersonatorRole ? req.user.staffId : undefined; // If impersonating, this is restricted, but just in case

    if (!performerId) return res.status(401).json({ error: 'Unauthorized' });

    await prisma.$transaction(async (tx) => {
      // 1. Save or update the override
      if (isGranted === null) {
        // Remove override (revert to default)
        await tx.staffPermission.deleteMany({
          where: { staffId: targetStaffId, permissionCode }
        });
      } else {
        // Create or update
        await tx.staffPermission.upsert({
          where: {
            staffId_permissionCode: {
              staffId: targetStaffId,
              permissionCode
            }
          },
          update: { isGranted },
          create: {
            staffId: targetStaffId,
            permissionCode,
            isGranted
          }
        });
      }

      // 2. Log Audit
      await AuditService.log(
        tx,
        isGranted === null ? 'REVERT_PERMISSION' : (isGranted ? 'GRANT_PERMISSION' : 'REVOKE_PERMISSION'),
        performerId,
        { permissionCode, isGranted },
        targetStaffId,
        impersonatorId
      );
    });

    res.json({ success: true });
  } catch (error) {
    console.error('overridePermission error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
