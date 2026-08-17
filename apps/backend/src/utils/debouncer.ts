let timeoutId: NodeJS.Timeout | null = null;
let isBackingUp = false;
let pendingBackup = false;

export const triggerDebouncedBackup = () => {
  if (timeoutId) {
    clearTimeout(timeoutId);
  }
  timeoutId = setTimeout(async () => {
    await performBackup();
  }, 30000); // 30 seconds debounce
};

const performBackup = async () => {
  if (isBackingUp) {
    pendingBackup = true;
    return;
  }
  isBackingUp = true;
  try {
    const { backupDatabase } = await import('../services/backup');
    await backupDatabase();
  } catch (err) {
    console.error('[Debouncer] Backup failed:', err);
  } finally {
    isBackingUp = false;
    if (pendingBackup) {
      pendingBackup = false;
      triggerDebouncedBackup();
    }
  }
};
