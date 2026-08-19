import bcrypt from 'bcryptjs';
async function main() {
  try {
    const isMatch = await bcrypt.compare('FanE@2026', 'FanE@2026');
    console.log('Match?', isMatch);
  } catch (err) {
    console.error('Bcrypt error:', err);
  }
}
main();
