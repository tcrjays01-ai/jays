const fs = require('fs');
let html = fs.readFileSync('ascii_realtime.html', 'utf8');

// Fix accidental literal '\n' injected by previous patches
html = html.replace(/\\n/g, '\n');

// Guarantee the CSS is pristine
html = html.replace(/html \{ width: 100%; height: 100%; margin: 0; padding: 0; \}body \{/, 
`html { width: 100%; height: 100%; margin: 0; padding: 0; }
body {`);

fs.writeFileSync('ascii_realtime.html', html, 'utf8');
