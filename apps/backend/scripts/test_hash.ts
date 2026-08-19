import bcrypt from 'bcryptjs';

async function main() {
  const hash = '$2b$10$J3tRcir9Ev7b4z84dFjkOeyKl85QWUgCmgS/BAfk/B8Pnmws.53p.';
  const plain = 'FanE@2026';
  
  const isMatch = await bcrypt.compare(plain, hash);
  console.log('Match?', isMatch);
}

main().catch(console.error);
