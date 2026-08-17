const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const { token } = JSON.parse(data);
    if (!token) {
      console.log('Login failed:', data);
      return;
    }
    
    const dashOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/dashboard',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
    
    const dashReq = http.request(dashOptions, (dashRes) => {
      let dashData = '';
      dashRes.on('data', (chunk) => dashData += chunk);
      dashRes.on('end', () => {
        console.log('Dashboard Status:', dashRes.statusCode);
        console.log('Dashboard Response:', dashData.substring(0, 500));
      });
    });
    dashReq.end();
  });
});

req.write(JSON.stringify({ email: 'nhitv@fantasticeggs.vn', password: '123456' }));
req.end();
