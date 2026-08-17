import { Telegraf, Context } from 'telegraf';
import { prisma } from '../config/prisma';

export const setupHandlers = (bot: Telegraf<Context>) => {
  bot.command('start', async (ctx) => {
    await ctx.reply('Chào mừng đến với FanE KMS Bot. Vui lòng nhập Staff ID của bạn để liên kết tài khoản (VD: /link STAFF_001)');
  });

  bot.command('link', async (ctx) => {
    const text = (ctx.message as any).text || '';
    const staffId = text.split(' ')[1];
    if (!staffId) return ctx.reply('Cú pháp: /link STAFF_001');

    const staff = await prisma.staff.findUnique({ where: { staffId } });
    if (!staff) return ctx.reply('Không tìm thấy Staff ID.');

    await prisma.staff.update({
      where: { staffId },
      data: { telegramId: String(ctx.from?.id) }
    });

    ctx.reply(`Đã liên kết thành công với tài khoản: ${staff.fullName}`);
  });

  bot.command('force_remind', async (ctx) => {
    const telegramId = String(ctx.from?.id);
    const staff = await prisma.staff.findFirst({ where: { telegramId } });
    
    if (!staff) {
      return ctx.reply('Bạn chưa liên kết tài khoản. Vui lòng dùng lệnh /link STAFF_ID trước.');
    }

    const assignees = await prisma.taskAssignee.findMany({
      where: { staffId: staff.staffId, isDone: false },
      include: { task: true },
      orderBy: { createdAt: 'asc' }
    });

    if (assignees.length === 0) {
      return ctx.reply('Bạn không có task nào đang pending hôm nay.');
    }

    let msg = '👋 Chào bạn, đây là nhắc nhở log timesheet! Hôm nay bạn đã làm các task sau:\n\n';
    const aliases: Record<string, string> = {};
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    assignees.forEach((a, index) => {
      const alias = letters[index % letters.length];
      aliases[alias] = a.taskId;
      msg += `*${alias}*: ${a.task.name}\n`;
    });
    
    msg += '\n👉 Vui lòng gõ số giờ theo cú pháp (VD: `A4 B2` để log 4h cho task A, 2h cho task B) hoặc gõ `0` để bỏ qua hôm nay.';

    (ctx as any).session.task_aliases = aliases;
    (ctx as any).session.target_date = new Date().toISOString();

    await ctx.reply(msg, { parse_mode: 'Markdown' });
  });

  bot.on('text', async (ctx: any) => {
    const text = ctx.message.text.trim();
    // Ignore commands
    if (text.startsWith('/')) return;

    const session = ctx.session as any;

    if (text === '0') {
      session.task_aliases = null;
      session.target_date = null;
      return ctx.reply('Đã bỏ qua log timesheet hôm nay. Cảm ơn bạn!');
    }

    if (session.task_aliases) {
      const telegramId = String(ctx.from?.id);
      const staff = await prisma.staff.findFirst({ where: { telegramId } });
      if (!staff) return ctx.reply('Tài khoản chưa được liên kết.');

      // Parse text like "A4 B2" or "A:4, b:2"
      const regex = /([A-Za-z])\s*[:=\-]?\s*(\d+(?:\.\d+)?)/g;
      let match;
      const logs = [];
      
      while ((match = regex.exec(text)) !== null) {
        const alias = match[1].toUpperCase();
        const hours = parseFloat(match[2]);
        if (session.task_aliases[alias] && !isNaN(hours) && hours > 0) {
          logs.push({ taskId: session.task_aliases[alias], hours, alias });
        }
      }

      if (logs.length === 0) {
        return ctx.reply('Sai cú pháp hoặc không tìm thấy task. Vui lòng thử lại (VD: `A4 B2`).', { parse_mode: 'Markdown' });
      }

      const targetDate = new Date(session.target_date || new Date());
      const today = new Date();
      let note = '';
      if (targetDate.getDate() !== today.getDate() || targetDate.getMonth() !== today.getMonth()) {
        note = `\n*(Lưu ý: Đang log cho ngày ${targetDate.toLocaleDateString('vi-VN')})*`;
      }

      let replyMsg = `✅ Đã ghi nhận thành công:${note}\n`;
      
      for (const log of logs) {
        await prisma.timesheet.create({
          data: {
            staffId: staff.staffId,
            taskId: log.taskId,
            hoursLogged: log.hours,
            logDate: targetDate,
            approvalStatus: 'Pending',
            logSource: 'Telegram'
          }
        });
        replyMsg += `- Task ${log.alias}: ${log.hours}h\n`;
      }

      // Clear state
      session.task_aliases = null;
      session.target_date = null;

      ctx.reply(replyMsg, { parse_mode: 'Markdown' });
    } else {
      ctx.reply('Xin lỗi, tôi không hiểu. Bạn chưa có nhắc nhở log timesheet nào đang chờ.');
    }
  });
};
