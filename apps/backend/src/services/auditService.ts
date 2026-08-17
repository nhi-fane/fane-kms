import { PrismaClient, Prisma } from '@prisma/client';

export class AuditService {
  /**
   * Logs an audit action into the database. Can be used with an existing Prisma Transaction client.
   * 
   * @param tx Prisma Client or Transaction Client
   * @param action The action performed (e.g., 'GRANT_PERMISSION')
   * @param performedById The real staff ID who performed the action
   * @param details JSON object containing details of the action
   * @param targetStaffId (Optional) The staff ID whose data was modified
   * @param impersonatedId (Optional) The staff ID being impersonated, if applicable
   */
  static async log(
    tx: Prisma.TransactionClient | PrismaClient,
    action: string,
    performedById: string,
    details: any,
    targetStaffId?: string,
    impersonatedId?: string
  ) {
    return tx.auditLog.create({
      data: {
        action,
        performedById,
        details: JSON.stringify(details),
        targetStaffId: targetStaffId || null,
        impersonatedId: impersonatedId || null,
      },
    });
  }
}
