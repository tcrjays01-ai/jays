const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const URL_FILE = path.join(__dirname, 'tunnel_url.txt');

function start() {
  console.log('[CF-TUNNEL] Starting cloudflared...');
  
  const CLOUDFLARED = 'C:\\Users\\mandr\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Cloudflare.cloudflared_Microsoft.Winget.Source_8wekyb3d8bbwe\\cloudflared.exe';
  const proc = spawn(CLOUDFLARED, ['tunnel', '--url', 'http://localhost:9090', '--no-autoupdate', '--protocol', 'http2'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let urlFound = false;

  function parseLine(line) {
    // cloudflared prints the URL to stderr like:
    // "... | https://xxx-xxx-xxx.trycloudflare.com"
    const match = line.match(/(https:\/\/[a-z0-9-]+\.trycloudflare\.com)/);
    if (match && !urlFound) {
      urlFound = true;
      const url = match[1];
      console.log('[CF-TUNNEL] ✅ PUBLIC URL:', url);
      console.log('[CF-TUNNEL] Full page:', url + '/ascii_realtime.html');
      fs.writeFileSync(URL_FILE, url + '/ascii_realtime.html', 'utf8');
    }
  }

  proc.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(l => { if (l.trim()) { console.log('[CF-OUT]', l.trim()); parseLine(l); } });
  });

  proc.stderr.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(l => { if (l.trim()) { console.log('[CF-ERR]', l.trim()); parseLine(l); } });
  });

  proc.on('exit', (code) => {
    console.log('[CF-TUNNEL] Process exited with code', code, '- pm2 will restart');
    process.exit(1);
  });

  proc.on('error', (err) => {
    console.error('[CF-TUNNEL] Spawn error:', err);
    process.exit(1);
  });
}

start();
