const fs = require('fs');
let html = fs.readFileSync('ascii_realtime.html', 'utf8');

// Replace the bad body, html { ... } CSS
html = html.replace(/body, html { display: flex; flex-direction: row; margin: 0; padding: 0; overflow: hidden; background: #FFF; font-family: 'Consolas', monospace; height: 100vh; width: 100vw; }/g, 
    "html { width: 100%; height: 100%; margin: 0; padding: 0; }\\n" +
    "body { display: flex; flex-direction: row; margin: 0; padding: 0; overflow: hidden; background: #FFF; font-family: 'Consolas', monospace; height: 100vh; width: 100vw; }");

fs.writeFileSync('ascii_realtime.html', html, 'utf8');
