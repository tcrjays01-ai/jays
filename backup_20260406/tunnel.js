const localtunnel = require('localtunnel');

async function startTunnel() {
  console.log('[TUNNEL] Connecting...');
  const tunnel = await localtunnel({ port: 9090, subdomain: 'cosmic-ascii-engine' });
  console.log('[TUNNEL] Connected:', tunnel.url);

  // Health check every 30 seconds - if tunnel is dead, exit so pm2 restarts us
  const healthCheck = setInterval(async () => {
    try {
      const http = require('https');
      const req = http.get(tunnel.url, { headers: { 'Bypass-Tunnel-Reminder': 'true' }, timeout: 10000 }, (res) => {
        if (res.statusCode >= 500) {
          console.log('[TUNNEL] Health check FAILED (status ' + res.statusCode + '), restarting...');
          clearInterval(healthCheck);
          tunnel.close();
          process.exit(1);
        } else {
          console.log('[TUNNEL] Health check OK (status ' + res.statusCode + ')');
        }
      });
      req.on('error', (err) => {
        console.log('[TUNNEL] Health check ERROR:', err.message, ', restarting...');
        clearInterval(healthCheck);
        tunnel.close();
        process.exit(1);
      });
      req.on('timeout', () => {
        console.log('[TUNNEL] Health check TIMEOUT, restarting...');
        req.destroy();
        clearInterval(healthCheck);
        tunnel.close();
        process.exit(1);
      });
    } catch(e) {
      console.log('[TUNNEL] Health check exception:', e.message);
      clearInterval(healthCheck);
      process.exit(1);
    }
  }, 30000);

  tunnel.on('close', () => {
    console.log('[TUNNEL] Connection closed, exiting for restart...');
    clearInterval(healthCheck);
    process.exit(1);
  });

  tunnel.on('error', (err) => {
    console.error('[TUNNEL] Error:', err);
    clearInterval(healthCheck);
    process.exit(1);
  });
}

startTunnel().catch(err => {
  console.error('[TUNNEL] Fatal:', err);
  process.exit(1);
});
