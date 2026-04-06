const fs = require('fs');
let html = fs.readFileSync('ascii_realtime.html', 'utf8');

// 1. CSS adjustments for Layout
const css_patch = `
        body, html { display: flex; flex-direction: row; margin: 0; padding: 0; overflow: hidden; background: #FFF; font-family: 'Consolas', monospace; height: 100vh; }
        
        #settings-panel {
            position: relative !important;
            transform: none !important;
            opacity: 1 !important;
            pointer-events: auto !important;
            width: 280px !important;
            min-width: 280px !important;
            height: 100vh !important;
            background: #FFF;
            border: none !important;
            border-right: 1px solid #E0E0E0 !important;
            z-index: 100;
        }

        #main-view {
            flex: 1;
            position: relative;
            background: #FFF;
            overflow: hidden;
        }
        
        #settings-toggle { display: none !important; }
        #settings-close { display: none !important; }
        
        button.invert { background:#FFF; color:#000; border:1px solid #000; width:100%; transition: 0.2s;}
        button.invert.on { background:#000; color:#FFF; }

        canvas { position: absolute; left: 0; right: 0; top: 0; bottom: 0; z-index: 1; display: block; width: 100%; height: 100%; object-fit: cover; }
        
        /* Ensure stripe-bg and ui-layer stretch fully in main-view */
        #stripe-bg { position: absolute; top:0; left:0; right:0; bottom:0; z-index: 0; pointer-events: none; }
        #ui-layer { position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 20; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(255,255,255,0.8); }
`;
html = html.replace('</style>', css_patch + '\n</style>');

// 2. Wrap DOM into Settings Panel and Main View
// Extract settings panel
let settingsMatch = html.match(/<div id="settings-panel">([\s\S]*?)<\/div>\s*<button id="source-btn"/);
if (!settingsMatch) console.error("Could not find settings-panel");
let settingsContent = settingsMatch[0];

// Remove the extracted settings-panel, settings-toggle, and source-btn from original body
html = html.replace(/<button id="settings-toggle"[\s\S]*?<\/button>/, '');
html = html.replace(settingsContent, ''); // removes settings panel and source btn (source-btn will be omitted or moved if needed, it's just 'CHANGE SOURCE')

// Add INVERT button to settings-title
settingsContent = settingsContent.replace(/<div id="settings-title">([\s\S]*?)<\/div>/, `<div id="settings-title">$1<button id="btn-invert" class="invert" onclick="toggleInvert()" style="margin-top:10px; padding:8px; font-weight:800; cursor:pointer;">INVERT MODE: OFF</button></div>`);

// Now reshape the body
let rawBodyContent = html.match(/<body>([\s\S]*?)<script src=/)[1];
html = html.replace(rawBodyContent, `\n${settingsContent}\n<div id="main-view">\n${rawBodyContent.trim()}\n</div>\n`);


// 3. Add JS for INVERT
const js_patch = `
    let isInverted = false;
    let baseTheme = {
        bgColor: '#FFFFFF', z2: '#FFFFFF', z3: '#808080', z4: '#000000', txt: '#000000'
    };

    function toggleInvert() {
        isInverted = !isInverted;
        let btn = document.getElementById('btn-invert');
        let panel = document.getElementById('settings-panel');
        let mainView = document.getElementById('main-view');

        if (isInverted) {
            btn.textContent = 'INVERT MODE: ON'; btn.classList.add('on');
            panel.style.background = '#000'; panel.style.color = '#FFF'; panel.style.borderColor = '#333';
            mainView.style.background = '#000';
            
            // Swap core rendering colors specifically for invert
            bgColor = '#000000';
            colorZ2 = '#000000';
            colorZ3 = '#303030';
            colorZ4 = '#FFFFFF';
            colorText = '#FFFFFF';
        } else {
            btn.textContent = 'INVERT MODE: OFF'; btn.classList.remove('on');
            panel.style.background = '#FFF'; panel.style.color = '#000'; panel.style.borderColor = '#ccc';
            mainView.style.background = '#FFF';
            
            bgColor = baseTheme.bgColor;
            colorZ2 = baseTheme.z2;
            colorZ3 = baseTheme.z3;
            colorZ4 = baseTheme.z4;
            colorText = baseTheme.txt;
        }
        
        // Update DOM inputs to reflect new state if they exist
        let bgInput = document.getElementById('ctrl-bg'); if(bgInput) bgInput.value = bgColor;
        
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
`;

// Inject isInverted rendering line
html = html.replace("ctx.strokeStyle = '#000000';", "ctx.strokeStyle = isInverted ? '#FFFFFF' : '#000000';");

// Put JS additions after variables
html = html.replace("let bgColor = '#FFFFFF';", "let bgColor = '#FFFFFF';\n" + js_patch);

// Remove settings popup logic from Javascript
html = html.replace(/document\.getElementById\('settings-panel'\)\.classList\.add\('open'\);/g, '');
html = html.replace(/document\.getElementById\('settings-toggle'\)\.style\.display = 'none';/g, '');
html = html.replace(/document\.getElementById\('settings-toggle'\)\.style\.display = 'block';/g, '');

fs.writeFileSync('ascii_realtime.html', html, 'utf8');
