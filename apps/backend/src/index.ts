import { app } from './app';
import { bot } from './bot';
import { setupCronJobs } from './bot/cron';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
  
  console.log('[DEBUG] Token is:', process.env.TELEGRAM_BOT_TOKEN);
  if (process.env.TELEGRAM_BOT_TOKEN) {
    if (process.env.WEBHOOK_DOMAIN) {
      bot.telegram.setWebhook(`${process.env.WEBHOOK_DOMAIN}/webhook/telegram`)
        .then(() => console.log(`[Bot] Webhook set to ${process.env.WEBHOOK_DOMAIN}`))
        .catch(err => console.log('[Bot] Failed to set webhook:', err.message));
    } else {
      console.log('\x1b[32m[Bot] Running (Polling)\x1b[0m');
      bot.launch().catch(err => console.log('[Bot] Failed to start:', err.message));
    }
  } else {
    console.log('[Bot] TELEGRAM_BOT_TOKEN missing, skipping bot launch');
  }
  setupCronJobs();
  console.log('[Cron] Initialized');
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
