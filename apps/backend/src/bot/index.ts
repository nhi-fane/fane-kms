import { Telegraf } from 'telegraf';
import LocalSession from 'telegraf-session-local';
import { setupHandlers } from './handlers';

export const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || 'fake_token');

// Setup local session for state management
export const localSession = new LocalSession({ database: 'session_db.json' });
bot.use(localSession.middleware());

setupHandlers(bot);
