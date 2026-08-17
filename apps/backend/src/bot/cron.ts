import cron from 'node-cron';
import { prisma } from '../config/prisma';
import { bot } from './index';
import { cleanupOldBackups } from '../services/backup';
import { localSession } from './index';

export const setupCronJobs = () => {
  // 1. Daily Timesheet Reminder (18:00)
  cron.schedule('0 18 * * 1-5', async () => {
    console.log('[Cron] Running daily timesheet reminder...');
    const activeStaff = await prisma.staff.findMany({
      where: { isActive: true, telegramId: { not: null } }
    });

    for (const staff of activeStaff) {
      // Find today's assigned tasks
      const assignees = await prisma.taskAssignee.findMany({
        where: { staffId: staff.staffId, isDone: false },
        include: { task: true },
        orderBy: { createdAt: 'asc' }
      });

      if (assignees.length > 0) {
        let msg = '👋 Chào bạn, đã đến giờ log timesheet! Hôm nay bạn đã làm các task sau:\n\n';
        
        const aliases: Record<string, string> = {};
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        
        assignees.forEach((a, index) => {
          const alias = letters[index % letters.length];
          aliases[alias] = a.taskId;
          msg += `*${alias}*: ${a.task.name}\n`;
        });
        
        msg += '\n👉 Vui lòng gõ số giờ theo cú pháp (VD: `A4 B2` để log 4h cho task A, 2h cho task B) hoặc gõ `0` để bỏ qua hôm nay.';

        try {
          await bot.telegram.sendMessage(staff.telegramId!, msg, { parse_mode: 'Markdown' });
          
          // Update session
          const sessionKey = `${staff.telegramId}:${staff.telegramId}`;
          const currentData = (localSession.DB as any).get('sessions').getById(sessionKey).value() || { id: sessionKey, data: {} };
          currentData.data = currentData.data || {};
          currentData.data.task_aliases = aliases;
          currentData.data.target_date = new Date().toISOString();
          
          (localSession.DB as any).get('sessions').upsert(currentData).write();
        } catch (e) {
          console.error(`[Cron] Failed to send to ${staff.telegramId}`, e);
        }
      }
    }
  });

  // 2. Automated SQLite Backup Cleanup (03:00)
  cron.schedule('0 3 * * *', async () => {
    console.log('[Cron] Running automated backup cleanup...');
    await cleanupOldBackups();
  });
};
