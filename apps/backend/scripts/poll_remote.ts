async function poll() {
  console.log('Polling remote login endpoint...');
  while (true) {
    try {
      const res = await fetch('https://fane-kms-backend.onrender.com/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'fake@example.com', password: 'password' })
      });
      const data = await res.json();
      
      // If we see 'details', the new code has been deployed!
      if (data.details) {
        console.log('\n--- NEW CODE DEPLOYED! ---');
        console.log('Status:', res.status);
        console.log('Error Data:', JSON.stringify(data, null, 2));
        break;
      }
      
      process.stdout.write('.');
    } catch (err) {
      console.error('Fetch error:', err);
    }
    await new Promise(r => setTimeout(r, 5000));
  }
}
poll();
