const fs = require('fs');
let html = fs.readFileSync('ascii_realtime.html', 'utf8');

// Fix the CSS to ensure body takes full width
html = html.replace(/height: 100vh;/g, 'height: 100vh; width: 100vw;');

fs.writeFileSync('ascii_realtime.html', html, 'utf8');
