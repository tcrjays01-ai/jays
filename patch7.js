const fs = require('fs');
let html = fs.readFileSync('ascii_realtime.html', 'utf8');

// Ensure absolute mathematical dimensions so it physically cannot collapse
html = html.replace(/#main-view {[\s\S]*?}/, 
`#main-view {
    position: relative;
    width: calc(100vw - 330px);
    height: 100vh;
    background: #FFF;
    overflow: hidden;
}`);

// Ensure body uses flex
html = html.replace(/body \{[\s\S]*?\}/, 
`body { 
    display: flex; 
    flex-direction: row; 
    margin: 0; 
    padding: 0; 
    overflow: hidden; 
    background: #FFF; 
    font-family: 'Consolas', monospace; 
    width: 100vw; 
    height: 100vh; 
}`);

fs.writeFileSync('ascii_realtime.html', html, 'utf8');
