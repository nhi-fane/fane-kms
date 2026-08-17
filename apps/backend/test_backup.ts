import { prisma } from './src/config/prisma';
import fs from 'fs';
import path from 'path';

async function triggerTest() {
  console.log('🚀 Đang ghi một dữ liệu ảo vào Database để kích hoạt Backup...');
  
  await prisma.client.create({
    data: {
      clientCode: 'TEST_' + Date.now(),
      name: 'Dummy Client để test Backup'
    }
  });

  console.log('✅ Ghi dữ liệu thành công!');
  console.log('⏱️ Đang chờ 35 giây để Debouncer thực thi Backup (Local & Google Drive)...');
  
  // Keep process alive for 35 seconds to allow debounce to fire
  await new Promise(resolve => setTimeout(resolve, 35000));
  
  // Verify local backup file
  const dateStr = new Date().toISOString().split('T')[0];
  const backupFileName = `backup_dev_${dateStr}.db`;
  const backupPath = path.join(__dirname, 'backups', backupFileName);
  
  if (fs.existsSync(backupPath)) {
    const stats = fs.statSync(backupPath);
    console.log(`\n🎉 KIỂM TRA THÀNH CÔNG!`);
    console.log(`- File Local Backup: ${backupPath}`);
    console.log(`- Last Modified: ${stats.mtime}`);
  } else {
    console.log(`\n❌ THẤT BẠI: Không tìm thấy file backup tại ${backupPath}`);
  }
}

triggerTest();
