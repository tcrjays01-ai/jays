import re

with open('tmp_original.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. UI Overhaul (CSS)
new_css = """
    <style>
        body, html { margin: 0; padding: 0; overflow: hidden; background: #FFF; font-family: 'Consolas', monospace; display: flex; height: 100vh; }
        
        #settings-panel {
            min-width: 280px; width: 280px; max-width: 280px;
            height: 100vh;
            background: #FFF;
            border-right: 1px solid #E0E0E0;
            padding: 20px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
            z-index: 100;
        }
        
        #main-view {
            flex: 1;
            position: relative;
            background: #FFF;
            overflow: hidden;
        }

        #stripe-bg {
            position: absolute; top:0; left:0; right:0; bottom:0;
            background: repeating-linear-gradient( 90deg, transparent, transparent 1px, rgba(0,0,0,0.02) 1px, rgba(0,0,0,0.02) 10px );
            z-index: 0; pointer-events: none;
        }

        canvas { position: absolute; z-index: 1; display: block; width: 100%; height: 100%; object-fit: cover; }
        
        #ui-layer {
            position: absolute; top: 0; left: 0; right: 0; bottom: 0;
            z-index: 20; display: flex; flex-direction: column; align-items: center; justify-content: center;
            background: rgba(255,255,255,0.8);
        }
        #ui-layer h2 { font-size: 32px; font-weight: 800; letter-spacing: 2px; margin-bottom: 5px; }
        #ui-layer p { font-size: 14px; font-weight: 700; opacity: 0.5; margin-bottom: 30px; letter-spacing: 1px; }
        #ui-layer button {
            background: #000; color: #FFF; border: none; padding: 12px 30px; font-family: inherit;
            font-size: 14px; font-weight: 800; cursor: pointer; margin: 5px; outline: none; letter-spacing: 1px;
        }
        
        #controls-container {
            position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 30;
            display: flex; gap: 10px;
        }
        #controls-container button {
            background: #FFF; color: #000; border: 1px solid #000; padding: 10px 20px; font-family: inherit;
            font-size: 12px; font-weight: 800; cursor: pointer; letter-spacing: 1px; outline: none; transition: 0.2s;
        }
        #controls-container button:hover { background: #f0f0f0; }
        #record-btn.active { color: #FF0000; border-color: #FF0000; }
        
        #tutorial-toast {
            position: absolute; top: 20px; left: 50%; transform: translateX(-50%); z-index: 30;
            background: #000; color: #FFF; padding: 10px 20px; font-weight: 800; font-size: 12px;
            pointer-events: none; opacity: 0; transition: opacity 0.5s ease;
        }

        #hud { position: absolute; bottom: 20px; right: 20px; z-index: 10; font-size: 10px; font-weight: 800; color: #aaa; pointer-events: none; }

        /* Sidebar UI Styling */
        #settings-title { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; display:flex; justify-content:space-between; align-items:center; }
        .ctrl-section { margin-bottom: 15px; }
        .ctrl-label { font-size: 10px; font-weight: 800; opacity: 0.6; display: block; margin-bottom: 4px; text-transform: uppercase; letter-spacing:1px; }
        .ctrl-section textarea, .ctrl-section select { width: 100%; box-sizing: border-box; border: 1px solid #ccc; padding: 6px; font-family: inherit; font-size: 11px; font-weight: 700; outline: none; background: #FFF; }
        .ctrl-section textarea { min-height: 50px; resize: vertical; line-height: 1.4; }
        .ctrl-inline { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .ctrl-inline input[type="range"] { flex: 1; height: 1px; accent-color: #000; cursor: pointer; }
        .ctrl-val { font-size: 11px; font-weight: 800; min-width: 36px; text-align: right; }
        .ctrl-inline input[type="color"] { width: 20px; height: 20px; border: 1px solid #ccc; padding: 0; cursor: pointer; background: none; }
        #color-hex, #bg-hex { font-size: 10px; font-weight: 800; }
        .ctrl-divider { border: none; border-top: 1px solid #eee; margin: 15px 0; }
        
        .side-btn { width:100%; background:#000; color:#FFF; font-weight:800; border:none; padding:10px; cursor:pointer; font-family:inherit; margin-top:5px; transition:0.2s;}
        .side-btn.invert { background:#FFF; color:#000; border:1px solid #000; }
        .side-btn.invert.on { background:#000; color:#FFF; }

        @media (max-width: 767px) {
            body, html { flex-direction: column; }
            #settings-panel { width: 100%; max-width: 100%; height: auto; max-height: 40vh; border-right: none; border-bottom: 1px solid #ddd; }
            #main-view { width: 100%; height: 60vh; }
        }
    </style>
"""
html = re.sub(r'<style>.*?</style>', new_css, html, flags=re.DOTALL)

# 2. HTML Structure Overhaul
new_html_structure = """
<body>
    <div id="settings-panel">
        <div id="settings-title">
            <span>COSMIC</span>
        </div>
        
        <button id="btn-invert" class="side-btn invert" onclick="toggleInvert()">INVERT: OFF</button>
        <button id="btn-home" class="side-btn" onclick="returnToMenu()">← BACK TO HOME</button>

        <hr class="ctrl-divider">

        <span class="ctrl-label">TEXT CONTENT</span>
        <div class="ctrl-section">
            <textarea id="ctrl-text" rows="3" onchange="applyText(this.value)">WE ARE NOT RAY
WE ARE COSMIC</textarea>
        </div>

        <div class="ctrl-section">
            <span class="ctrl-label">TYPEFACE</span>
            <select id="ctrl-font" onchange="applyFont(this.value)">
                <option value="Anton">Anton (Block)</option>
                <option value="Playfair Display">Playfair (Chic)</option>
                <option value="VT323">VT323 (Retro)</option>
                <option value="Silkscreen">Silkscreen (Pixel)</option>
                <option value="JetBrains Mono">JetBrains Mono</option>
                <option value="Space Mono">Space Mono</option>
            </select>
        </div>

        <hr class="ctrl-divider">

        <div class="ctrl-section">
            <span class="ctrl-label">DARKNESS THRESHOLD</span>
            <div class="ctrl-inline">
                <input type="range" id="ctrl-thresh" min="0" max="1" step="0.01" value="0.12" oninput="applyThreshold(this.value)">
                <span class="ctrl-val" id="thresh-val">0.12</span>
            </div>
        </div>

        <div class="ctrl-section">
            <span class="ctrl-label">BLUE POINT LIMIT</span>
            <div class="ctrl-inline">
                <input type="range" id="ctrl-zone1" min="0" max="0.6" step="0.01" value="0.15" oninput="applyZone1(this.value)">
                <span class="ctrl-val" id="zone1-val">15%</span>
            </div>
        </div>

        <div class="ctrl-section">
            <span class="ctrl-label">COLOR PHASE (DEPTH)</span>
            <div class="ctrl-inline">
                <input type="range" id="ctrl-contrast" min="0" max="1.0" step="0.01" value="0" oninput="applyContrast(this.value)">
                <label style="display:flex;align-items:center;gap:4px;font-size:9px;font-weight:800;cursor:pointer;">
                    <input type="checkbox" id="ctrl-auto-phase" onchange="applyAutoPhase(this.checked)"> AUTO WAVES
                </label>
            </div>
        </div>
    </div>
    
    <div id="main-view">
        <div id="stripe-bg"></div>
        <canvas id="ascii-canvas"></canvas>
        <div id="ui-layer">
            <h2>WE ARE COSMIC</h2>
            <p>SELECT SOURCE TO BEGIN</p>
            <input type="file" id="videoUpload" accept="video/mp4,video/webm,video/*" style="display:none;">
            <button onclick="document.getElementById('videoUpload').click()">SELECT VIDEO</button>
            <button onclick="tryLocalVideo()">PLAY CHOI</button>
            <button onclick="startCameraSource()">CAMERA</button>
        </div>
        
        <div id="controls-container" style="display:none;">
            <button id="webcam-toggle" onclick="toggleWebcam()">⚡ HAND CONTROL: OFF</button>
            <button id="record-btn" onclick="toggleRecording()">⏺ REC VIDEO</button>
        </div>

        <div id="tutorial-toast">🖱️ SCROLL TO ZOOM GRID</div>
        <div id="hud"><span id="hud-grid"></span> | <span id="hud-fps"></span> | <span id="hud-hand"></span></div>
    </div>
"""
html = re.sub(r'<body>.*?(?=<script src=)', new_html_structure, html, flags=re.DOTALL)

# 3. Add isInverted flag & Stroke style
js_additions = """
    let isInverted = false;
    let baseBgColor = '#FFFFFF';
    let baseColorZ2 = '#FFFFFF';
    let baseColorZ3 = '#808080';
    let baseColorZ4 = '#000000';
    let baseColorText = '#000000';

    function returnToMenu() {
        if (webcamActive) stopWebcam();
        if (video) { video.pause(); video.srcObject = null; video.removeAttribute('src'); }
        isPlaying = false;
        
        document.getElementById('ui-layer').style.display = 'flex';
        document.getElementById('controls-container').style.display = 'none';
        
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    function toggleInvert() {
        isInverted = !isInverted;
        let btn = document.getElementById('btn-invert');
        if (isInverted) {
            btn.textContent = 'INVERT: ON'; btn.classList.add('on');
            bgColor = '#000000';
            colorZ2 = '#000000';
            colorZ3 = '#222222';
            colorZ4 = '#FFFFFF';
            colorText = '#FFFFFF';
        } else {
            btn.textContent = 'INVERT: OFF'; btn.classList.remove('on');
            bgColor = baseBgColor;
            colorZ2 = baseColorZ2;
            colorZ3 = baseColorZ3;
            colorZ4 = baseColorZ4;
            colorText = baseColorText;
        }
    }
    
    function applyThreshold(val) {
        darknessThreshold = parseFloat(val);
        document.getElementById('thresh-val').textContent = darknessThreshold;
    }
"""

html = html.replace('let bgColor = \'#FFFFFF\';', 'let bgColor = \'#FFFFFF\';\n' + js_additions)

html = html.replace("ctx.strokeStyle = '#000000';", "ctx.strokeStyle = isInverted ? '#FFFFFF' : '#000000';")

# Ensure video play functions hide the UI correctly inside the new DOM
html = html.replace("document.getElementById('settings-panel').classList.add('open');", "")
html = html.replace("document.getElementById('settings-toggle').style.display = 'none';", "")

with open('ascii_realtime.html', 'w', encoding='utf-8') as f:
    f.write(html)
