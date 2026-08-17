const ngrok = require('ngrok');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
require('dotenv').config();

async function start() {
  try {
    console.log('🚀 Đang khởi tạo đường hầm Ngrok...');
    const url = await ngrok.connect(3000);
    console.log('✅ Ngrok Tunnel đã mở tại:', url);

    // 1. Update Backend .env
    const envPath = path.join(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      if (envContent.includes('WEBHOOK_DOMAIN=')) {
        envContent = envContent.replace(/WEBHOOK_DOMAIN=.*/g, `WEBHOOK_DOMAIN=${url}`);
      } else {
        envContent += `\nWEBHOOK_DOMAIN=${url}`;
      }
      fs.writeFileSync(envPath, envContent);
      console.log('✅ Đã cập nhật WEBHOOK_DOMAIN trong Backend');
    }

    // 2. Update Frontend .env (nếu chạy local)
    const frontendEnvPath = path.join(__dirname, '../../frontend/.env');
    if (fs.existsSync(frontendEnvPath)) {
      let feEnvContent = fs.readFileSync(frontendEnvPath, 'utf8');
      if (feEnvContent.includes('VITE_API_URL=')) {
        feEnvContent = feEnvContent.replace(/VITE_API_URL=.*/g, `VITE_API_URL=${url}`);
      } else {
        feEnvContent += `\nVITE_API_URL=${url}`;
      }
      fs.writeFileSync(frontendEnvPath, feEnvContent);
      console.log('✅ Đã cập nhật VITE_API_URL trong Frontend');
    }

    console.log('🔥 Đang khởi động Backend Server & Đăng ký Webhook...');
    
    // Sử dụng npm run dev để chạy an toàn trên Windows
    const backend = spawn('npm', ['run', 'dev'], { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      shell: true
    });
    
    backend.on('close', (code) => {
      console.log(`❌ Backend process exited with code ${code}`);
      process.exit(code);
    });

  } catch (error) {
    console.error('❌ Lỗi khởi tạo hệ thống:', error);
    process.exit(1);
  }
}

start();
