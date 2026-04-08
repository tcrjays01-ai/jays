
    // ==========================================================
    // COSMIC ASCII ENGINE v4
    // ==========================================================

    // ?? Global State & Variables (Moved to Top for Safety) ??
    let video = null;
    let isCamera = false;
    let selfieSegmentation = null;
    let canvas, ctx;
    let offCanvas, offCtx;
    let cols = 0, rows = 0;
    let isPlaying = false;
    let segMask = false;
    let isSegmenting = false;
    let segCanvas = null, segCtx = null;
    let cellHistory = new Float32Array(0);
    let dotLife = new Float32Array(0);
    
    let currentFont = 'Pretendard Variable';
    let keyColor = '#0000FF';
    let darknessThreshold = 0.12;
    let contrastPow = 2.0;
    let zone1Limit = 0.35; // Standard default 35%
    let bluePhase = 0.0;
    let autoPhase = false;
    let basePhase = 0.0;
    let gradientMode = false;
    let gradientT = 0;
    let gradientDir = 1;
    let gradientFrom = [0, 0, 255];
    let gradientTo = [255, 0, 255];
    let bgColor = '#FFFFFF';
    let colorZ2 = '#FFFFFF'; let rgbZ2 = [255, 255, 255];
    let colorZ3 = '#808080';
    let colorZ4 = '#000000';
    let colorText = '#000000'; let rgbText = [0, 0, 0];
    let colorSymbol = '#0000FF'; let rgbSymbol = [0, 0, 255]; // Standard Symbol Default
    let CELL_SIZE = 150;
    let targetCellSize = 150;
    let frameCounter = 0, globalFrame = 0;
    let lastFpsTime = performance.now();
    let fpsDisplay = 0;
    let lastRenderTime = 0;
    let mpHands = null, mpCamera = null;
    let webcamActive = false, webcamVideo = null;
    let pinchDistance = -1;
    let mediaRecorder = null;
    let recordedChunks = [];
    let isIntro = false;
    let introStartTime = 0;
    let hasPlayedIntro = false;
    let isInverted = false;
    let baseTheme = null;

    let TEXT_FLOW = 'WE ARE NOT RAY        WE ARE COSMIC        WE ARE NOT RAY        WE ARE COSMIC        ';
    
    // --- 🎯 Character Set Presets ---
    const CHAR_SETS = {
        standard: ['+', '×', '÷', '=', 'Δ', '○', '↘', '■', '✦', '▚', '░'],
        botanical: ['✿', '❁', '❃', '❀', '✾', '☘', '🌿', '🌱', '🍃', '🌸', '🌼'],
        matrix: ['0', '1', '▰', '▱', '◧', '◨', '◩', '◪', '▣', '▤', '▥'],
        geometric: ['●', '○', '■', '□', '▲', '△', '▼', '▽', '◆', '◇', '◈'],
        chaos: ['!', '?', '#', '$', '&', '*', '@', '⊕', '⊗', '☣', '☢'],
        mosaic: ['●', '○', '+', '⊕', '■', '□', '▬', '◉', '▪', '◆', '⊞', '⊡']
    };
    let activeSymbols = CHAR_SETS.standard; // Default set
    let mosaicMode = false;

    function rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        let max = Math.max(r,g,b), min = Math.min(r,g,b), h, s, l = (max+min)/2;
        if (max === min) { h = s = 0; }
        else {
            let d = max - min; s = l > 0.5 ? d/(2-max-min) : d/(max+min);
            if (max===r) h = ((g-b)/d + (g<b?6:0))/6;
            else if (max===g) h = ((b-r)/d + 2)/6;
            else h = ((r-g)/d + 4)/6;
        }
        return [h, s, l];
    }
    function hslToRgb(h, s, l) {
        if (s === 0) { let v = Math.round(l*255); return [v,v,v]; }
        let q = l < 0.5 ? l*(1+s) : l+s-l*s, p = 2*l-q;
        let hue2rgb = (p,q,t) => { if(t<0)t+=1; if(t>1)t-=1; if(t<1/6)return p+(q-p)*6*t; if(t<1/2)return q; if(t<2/3)return p+(q-p)*(2/3-t)*6; return p; };
        return [Math.round(hue2rgb(p,q,h+1/3)*255), Math.round(hue2rgb(p,q,h)*255), Math.round(hue2rgb(p,q,h-1/3)*255)];
    }    function hexToRgb(hex) {
        let r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
        return [r, g, b];
    }
    function lerpColor(a, b, t) {
        return `rgb(${Math.round(a[0]+(b[0]-a[0])*t)},${Math.round(a[1]+(b[1]-a[1])*t)},${Math.round(a[2]+(b[2]-a[2])*t)})`;
    }

    // ?? UI Controls & Logic ??

    function setTheme(mode) {
        let btnW = document.getElementById('btn-white');
        let btnB = document.getElementById('btn-black');
        let btns = document.querySelectorAll('.premium-ctrl-btn');
        
        if (mode === 'black') {
            btnB.style.background = '#000'; btnB.style.color = '#FFF';
            btnW.style.background = '#FFF'; btnW.style.color = '#000';
            bgColor = '#000000'; colorZ2 = '#000000'; colorZ3 = '#606060'; colorZ4 = '#FFFFFF'; colorText = '#FFFFFF';
            btns.forEach(b => {
                b.style.borderColor = '#FFF';
                b.style.color = '#FFF';
            });
        } else {
            btnW.style.background = '#000'; btnW.style.color = '#FFF';
            btnB.style.background = '#FFF'; btnB.style.color = '#000';
            bgColor = '#FFFFFF'; colorZ2 = '#FFFFFF'; colorZ3 = '#808080'; colorZ4 = '#000000'; colorText = '#000000';
            btns.forEach(b => {
                b.style.borderColor = '#000';
                b.style.color = '#000';
            });
        }
        
        // Re-use or create theme style tag for dynamic hover effects
        let themeStyles = document.getElementById('dynamic-theme-styles');
        if (!themeStyles) {
            themeStyles = document.createElement('style');
            themeStyles.id = 'dynamic-theme-styles';
            document.head.appendChild(themeStyles);
        }
        themeStyles.innerHTML = `
            .premium-ctrl-btn::before { background: ${colorText} !important; }
            .premium-ctrl-btn:hover { color: ${bgColor} !important; }
        `;
        
        document.getElementById('ctrl-bg').value = bgColor;
        document.getElementById('bg-hex').textContent = bgColor.toUpperCase();
        document.getElementById('ctrl-col-z2').value = colorZ2;
        document.getElementById('ctrl-col-z3').value = colorZ3;
        document.getElementById('ctrl-col-z4').value = colorZ4;
        document.getElementById('ctrl-col-txt').value = colorText;
        if (ctx) { ctx.fillStyle = bgColor; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    }

    function toggleInvert() { setTheme(bgColor === '#FFFFFF' ? 'black' : 'white'); }

    // ==========================================================
    function init() {
        canvas = document.getElementById('ascii-canvas');
        ctx = canvas.getContext('2d');
        resizeCanvas();
        window.addEventListener('resize', () => resizeCanvas(currentVideoW, currentVideoH));

        // --- ?렞 Clear Canvas to White Initially ---
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // ------------------------------------------

        document.getElementById('videoUpload').addEventListener('change', (e) => {
            let f = e.target.files[0];
            if (f) {
                document.querySelector('button[onclick="document.getElementById(\'videoUpload\').click()"]').innerText = "LOADING...";
                loadVideo(URL.createObjectURL(f));
            }
        });
    }

    const CANVAS_W = 1080;
    const CANVAS_H = 1350;
    let currentVideoW = CANVAS_W, currentVideoH = CANVAS_H;

    function resizeCanvas(vw, vh) {
        // Store video dimensions for responsive resize events
        if (vw && vh) { currentVideoW = vw; currentVideoH = vh; }
        let srcW = currentVideoW, srcH = currentVideoH;

        // object-fit: contain — fit inside viewport preserving aspect ratio
        let screenW = window.innerWidth, screenH = window.innerHeight;
        let scale = Math.min(screenW / srcW, screenH / srcH);
        let displayW = Math.round(srcW * scale);
        let displayH = Math.round(srcH * scale);

        // Internal canvas resolution (DPR-aware for crisp text)
        let dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width  = displayW * dpr;
        canvas.height = displayH * dpr;

        // CSS: exact display size, centered in viewport
        canvas.style.width  = displayW + 'px';
        canvas.style.height = displayH + 'px';
        canvas.style.left   = Math.round((screenW - displayW) / 2) + 'px';
        canvas.style.top    = Math.round((screenH - displayH) / 2) + 'px';

        calcGrid();
        if (window.positionZoneHandle) window.positionZoneHandle();
    }

    function calcGrid() {
        let newCols = Math.floor(canvas.width / CELL_SIZE);
        let newRows = Math.floor(canvas.height / CELL_SIZE);

        // Update real-time pixel/grid info in the left menu
                        let infoVid = document.getElementById('info-vidsize');
        let unitSlider = document.getElementById('unit-slider');
        if (unitSlider) {
            let scaleVal = Math.round(((CELL_SIZE - 8) / 112) * 100);
            unitSlider.value = Math.max(0, Math.min(100, scaleVal));
        }
        if (infoVid) {
            infoVid.textContent = (currentVideoW && currentVideoH) ? currentVideoW + ' × ' + currentVideoH : '— × —';
        }

        if (!offCanvas) {
            offCanvas = document.createElement('canvas');
            offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
        }
        // ?ш린媛 諛붾??뚮쭔 由ъ궗?댁쫰 ??留??꾨젅???대━??諛⑹?
        if (newCols !== cols || newRows !== rows) {
            cols = newCols;
            rows = newRows;
            offCanvas.width = cols;
            offCanvas.height = rows;
            cellHistory = new Float32Array(cols * rows);
            cellHistory.fill(-1); // Mark as uninitialized
            dotLife = new Float32Array(cols * rows);
            dotLife.fill(0);
        }
    }

    function tryLocalVideo() {
        let btn = document.querySelector('button[onclick="tryLocalVideo()"]');
        if (btn) btn.innerText = "LOADING...";
        loadVideo('choi_insta.mp4');
    }

    function startCameraSource() {
        console.log("?렏 Starting Camera...");
        let btn = document.querySelector(`button[onclick="startCameraSource()"]`);
        btn.innerText = 'CONNECTING...';
        
        // --- ?렏 Camera Initial Preset ---
        updatePhaseUI(0.30); // Start at 30% for better facial details
        applyZone1(0.35);    // Width 35% (Default)
        contrastPow = 2.0;   // High contrast for camera
        // -------------------------------

        const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
        const facingMode = isMobile ? 'environment' : 'user';
        navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false })
            .then(stream => {
                if (video) { video.pause(); video.srcObject = null; video.remove(); }
                video = document.createElement('video');
                video.srcObject = stream;
                video.autoplay = true; video.muted = true; video.playsInline = true;
                video.addEventListener('canplay', () => {
                    document.getElementById('ui-layer').style.display = 'none';
                    document.getElementById('controls-container').style.display = 'flex';
            setTimeout(() => { if(window.positionZoneHandle) window.positionZoneHandle(); }, 100);
                    if (window.innerWidth > 767) {
                        document.getElementById('settings-panel').classList.add('open');
                        let _st=document.getElementById('settings-toggle'); if(_st) _st.style.setProperty('display','none','important');
                    } else {
                        let mobileBar = document.getElementById('mobile-top-btns'); if (mobileBar) mobileBar.style.display = 'flex'; let _mb = document.getElementById('mobile-top-btns'); if(_mb) _mb.style.display='flex';
                    }
                    isCamera = true;
                    initSegmentation();
                    video.play();
                    
                    // --- ?? UX Reveal: Show Controls + Toast together ---
                    document.body.classList.add('touch-show');
                    let toast = document.getElementById('tutorial-toast');
                    if (toast) {
                        toast.style.opacity = '1';
                        setTimeout(() => { 
                            toast.style.opacity = '0'; 
                            document.body.classList.remove('touch-show');
                        }, 4000);
                    }
                    
                    // Trigger Intro Zoom Effect for Webcam
                    isIntro = true;
                    introStartTime = performance.now() + 500;

                    isPlaying = true;
                    requestAnimationFrame(renderLoop);
                }, {once: true});
            })
            .catch(err => {
                btn.innerText = 'CAM';
                let ui = document.getElementById('ui-layer');
                ui.querySelector('h2').textContent = 'CAMERA ACCESS DENIED';
                ui.querySelector('p').textContent = '釉뚮씪?곗??먯꽌 移대찓??沅뚰븳???덉슜?댁＜?몄슂.';
            });
    }

    function returnToMenu() {
        let _mb2 = document.getElementById('mobile-top-btns'); if(_mb2) _mb2.style.display='none';
        if (webcamActive) stopWebcam();
        if (video) {
            video.pause();
            video.srcObject = null;
            video.removeAttribute('src');
        }
        isPlaying = false;
        
        document.getElementById('ui-layer').style.display = '';
        document.getElementById('controls-container').style.display = 'none';
        document.getElementById('settings-panel').classList.remove('open');
        document.getElementById('settings-toggle').style.display = 'none';
        
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    function updatePhaseUI(val) {
        let v = parseFloat(val);
        basePhase = v;
        bluePhase = v;
        window.bluePhase = v;
        if (window.positionZoneHandle) window.positionZoneHandle(); // Force global scope for reliability
        console.log("?렓 Phase Updated:", v);
        
        let slider = document.getElementById('ctrl-contrast');
        if (slider) slider.value = val;
        let valDisp = document.getElementById('contrast-val');
        if (valDisp) valDisp.innerText = Math.round(v * 100) + '%';
    }

    function initSegmentation() {
        if (!segCanvas) {
            segCanvas = document.createElement('canvas');
            segCtx = segCanvas.getContext('2d', { willReadFrequently: true });
        }
        selfieSegmentation = new SelfieSegmentation({
            locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${f}`
        });
        selfieSegmentation.setOptions({ modelSelection: 0 }); // 0 = general (Google Meet portrait style)
        selfieSegmentation.onResults((results) => { 
            if (results.segmentationMask) {
                // 遺??Stutter) 諛⑹?: 留덉뒪???댁긽?꾧? ?ㅻ? ?뚮쭔 罹붾쾭?ㅻ? 媛뺤젣 由ъ궗?댁쭠(硫붾え由??ы븷??諛⑹?)
                if (segCanvas.width !== results.segmentationMask.width) {
                    segCanvas.width = results.segmentationMask.width;
                    segCanvas.height = results.segmentationMask.height;
                }
                segCtx.clearRect(0, 0, segCanvas.width, segCanvas.height);
                segCtx.drawImage(results.segmentationMask, 0, 0);
                segMask = true;
            }
            isSegmenting = false; // Release lock
        });
    }

    function loadVideo(src) {
        if (typeof src !== "string") {
            window.lastUploadedVideoFile = src;
            let btn = document.getElementById("ai-extract-btn");
            if (btn) btn.style.display = "block";
            window.videoTranscripts = [];
        }

        console.log("?렗 Loading video:", src);
        
        // --- ?렗 Video Initial Preset (Image 1 Style) ---
        updatePhaseUI(0.0);  // Phase 0% (Leftmost)
        applyZone1(0.35);    // Width 35% (Default)
        contrastPow = 1.2;   // Natural contrast for video
        // -------------------------------

        if (video) { video.pause(); video.remove(); }
        video = document.createElement('video');
        video.src = typeof src === 'string' ? src : URL.createObjectURL(src);
        video.autoplay = true; video.loop = true; video.muted = false; video.playsInline = true;

        video.addEventListener('canplay', () => {
            // Adapt canvas to uploaded video resolution
            if (video.videoWidth && video.videoHeight) {
                resizeCanvas(video.videoWidth, video.videoHeight);
            }
            document.getElementById('ui-layer').style.display = 'none';
            document.getElementById('controls-container').style.display = 'flex';
            setTimeout(() => { if(window.positionZoneHandle) window.positionZoneHandle(); }, 100);
            if (window.innerWidth > 767) {
                document.getElementById('settings-panel').classList.add('open');
                let _st=document.getElementById('settings-toggle'); if(_st) _st.style.setProperty('display','none','important');
            } else {
                let mobileBar = document.getElementById('mobile-top-btns'); if (mobileBar) mobileBar.style.display = 'flex'; let _mb = document.getElementById('mobile-top-btns'); if(_mb) _mb.style.display='flex';
            }

            if (!hasPlayedIntro) {
                hasPlayedIntro = true;
                let toast = document.getElementById('tutorial-toast');
                if (toast) {
                    document.body.classList.add('touch-show');
                    toast.style.opacity = '1';
                    setTimeout(() => { 
                        toast.style.opacity = '0'; 
                        document.body.classList.remove('touch-show');
                    }, 4000); 
                }
            }

            // Always trigger Intro Zoom Effect for newly selected videos
            isIntro = true;
            introStartTime = performance.now() + 500;

            let playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise.catch(err => { console.warn("Auto-play blocked", err); });
            }
            isPlaying = true;
            requestAnimationFrame(renderLoop);
        }, {once: true});
        video.addEventListener('error', () => {
            let ui = document.getElementById('ui-layer');
            ui.style.display = '';
            ui.querySelector('h2').textContent = 'VIDEO LOAD FAILED';
            ui.querySelector('p').textContent = 'SELECT VIDEO 踰꾪듉?쇰줈 ?뚯씪??吏곸젒 ?좏깮?섏꽭??';
        });
        video.load();
    }

    // ==========================================================
    // RENDER
    // ==========================================================
    function renderLoop() {
        if (!isPlaying) return;
        let now = performance.now();


        let targetFrameDelay = 16;

        if (isIntro) {
            let elapsed = now - introStartTime;
            const INTRO_LEN = 3000;
            if (elapsed < 0) {
                CELL_SIZE = 150;
                targetFrameDelay = 125; // 8fps
            } else if (elapsed <= INTRO_LEN) {
                let t = elapsed / INTRO_LEN;
                let ease = 1 - Math.pow(1 - t, 3); // easeOutCubic
                CELL_SIZE = 150 + (12 - 150) * ease;
                targetFrameDelay = 125 + (42 - 125) * t; // 8fps ??24fps
            } else {
                isIntro = false;
                targetCellSize = 12;
            }
        } else {
            if (Math.abs(CELL_SIZE - targetCellSize) > 0.1) {
                CELL_SIZE = CELL_SIZE * 0.90 + targetCellSize * 0.10;
            } else {
                CELL_SIZE = targetCellSize;
            }
        }

        // Frame Throttling
        if (now - lastRenderTime < targetFrameDelay) {
            requestAnimationFrame(renderLoop);
            return;
        }
        lastRenderTime = now;

        // Reset context completely each frame
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.filter = 'none';
        ctx.globalCompositeOperation = 'source-over';

        CELL_SIZE = Math.max(12, Math.min(150, CELL_SIZE));
        calcGrid();

        // Draw video to offscreen ??keep last frame during seek (prevents flash on loop)
        if (video && video.readyState >= 2 && !video.seeking) {
            let vR = video.videoWidth / video.videoHeight;
            let cR = cols / rows;
            let dW, dH, dX, dY;
            if (cR > vR) {
                dW = cols; dH = cols / vR; dX = 0; dY = (rows - dH) / 2;
            } else {
                dH = rows; dW = rows * vR; dY = 0; dX = (cols - dW) / 2;
            }
            // Clear ONLY the letterbox areas, not the full canvas
            offCtx.fillStyle = '#FFF';
            if (dY > 0) { offCtx.fillRect(0, 0, cols, dY); offCtx.fillRect(0, rows - dY, cols, dY); }
            if (dX > 0) { offCtx.fillRect(0, 0, dX, rows); offCtx.fillRect(cols - dX, 0, dX, rows); }
            offCtx.drawImage(video, dX, dY, dW, dH);

            // Segmentation: 移대찓??紐⑤뱶?????щ엺怨?諛곌꼍 遺꾨━
            if (isCamera && selfieSegmentation) {
                // 鍮꾨룞湲?硫붾え由?援먯갑?곹깭(Deadlock) 諛⑹? 諛??꾨젅???띾룄 ?쇱튂
                if (!isSegmenting && video.readyState >= 2) {
                    isSegmenting = true;
                    selfieSegmentation.send({ image: video }).catch(err => {
                        console.error('Segmentation error:', err);
                        isSegmenting = false;
                    });
                }

                if (segMask) {
                    // CPU ?쎌? ?곗궛 ??? ?섎뱶?⑥뼱 媛??Canvas 釉붾젋?⑹쓣 ?ъ슜?섏뿬
                    // 寃쎄퀎?좎쓣 ?꾩＜ 遺?쒕읇怨?源붾걫?섍쾶 ?덊떚?⑤━?댁떛(Anti-Aliasing) 泥섎━?⑸땲??
                    
                    // 1. 嫄고뫖吏?Mask) ?곸슜: ?щ엺 ?곸뿭留??④린怨??섎㉧吏???щ챸?섍쾶 留뚮벀. (?곸긽怨??숈씪???꾩튂/鍮꾩쑉濡?留ㅽ븨)
                    offCtx.globalCompositeOperation = 'destination-in';
                    offCtx.filter = 'blur(6px)'; // ?ｌ? ?먭?嫄곕┝(Aliasing) ?꾨꼍 李⑤떒???꾪븳 ?먭볼??釉붾윭
                    offCtx.drawImage(segCanvas, dX, dY, dW, dH);
                    offCtx.filter = 'none'; // ?꾪꽣 ?먯긽蹂듦뎄
                    
                    // 2. ?щ챸?댁쭊 諛곌꼍???꾩쟾??媛뺤젣 ?곗깋(#FFFFFF)?쇰줈 梨꾩썙??ASCII 援ъ뿭??吏?
                    offCtx.globalCompositeOperation = 'destination-over';
                    offCtx.fillStyle = '#FFFFFF';
                    offCtx.fillRect(0, 0, cols, rows);
                    
                    // 3. ?⑹꽦 紐⑤뱶 珥덇린??
                    offCtx.globalCompositeOperation = 'source-over';
                }
            }
        }

        let imageData;
        try { imageData = offCtx.getImageData(0, 0, cols, rows); }
        catch(e) { requestAnimationFrame(renderLoop); return; }
        let pixels = imageData.data;

        // Clear background
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        let offsetX = (canvas.width - cols * CELL_SIZE) / 2;
        let offsetY = (canvas.height - rows * CELL_SIZE) / 2;

        let fontSize = Math.max(6, CELL_SIZE * 0.88);
        ctx.font = `400 ${fontSize}px '${currentFont}', 'Consolas', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Auto Phase wave breathing over time
        if (autoPhase) {
            bluePhase = (Math.sin(globalFrame * 0.04) * 0.5 + 0.5) * 0.85;
            let slider = document.getElementById('ctrl-contrast');
            if (slider && Math.abs(parseFloat(slider.value) - bluePhase) > 0.02) {
                slider.value = bluePhase;
            }
        }

        for (let j = 0; j < rows; j++) {
            for (let i = 0; i < cols; i++) {
                let idx = (j * cols + i) * 4;
                let r = pixels[idx], g = pixels[idx+1], b = pixels[idx+2];

                let luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
                
                // 留덉뒪?ъ뿉???섎젮?섍컙 諛곌꼍 諛??덊떚?⑤━?댁떛 寃쎄퀎瑜?遺?쒕읇寃?媛먮퀎 (?덉쟾?섍쾶 ?덇났?쇰줈 ?좊┝)
                let isBackground = (isCamera && luma > 0.98);

                // 罹??붾㈃ ?꾩슜 蹂댁젙: ?쇰?(諛앹? ?곸뿭)???좊젮??誘몃땲硫??罹붾쾭?ㅻ줈 留뚮뱾怨?
                // ?덇꼍?? 癒몃━移대씫, ?섏뿼 媛숈? 吏덇컧留??④린湲??꾪빐 ?鍮꾨? 媛뺥븯寃??좊┝(Blow out)
                if (isCamera && !isBackground) {
                    luma = (luma - 0.35) * 1.4 + 0.35; 
                    luma = Math.max(0.001, Math.min(0.999, luma));
                }
                
                let targetDarkness = 1.0 - luma;

                // ?뚮━而?Flickering) 諛⑹?瑜??꾪븳 Temporal Smoothing (?쒓퀎??遺?쒕윭? ?곗궛)
                let cellIdx = j * cols + i;
                let smoothSpeed = isCamera ? 0.20 : 0.60;
                
                if (targetDarkness === 0.0) {
                    // 諛곌꼍? ?붿긽(Ghost)???④린吏 ?딄퀬 利됱떆 吏?
                    cellHistory[cellIdx] = 0.0;
                } else if (cellHistory[cellIdx] === -1) {
                    cellHistory[cellIdx] = targetDarkness;
                } else {
                    cellHistory[cellIdx] = cellHistory[cellIdx] * (1 - smoothSpeed) + targetDarkness * smoothSpeed;
                }
                
                let darkness = cellHistory[cellIdx];

                let x = Math.floor(offsetX + i * CELL_SIZE);
                let y = Math.floor(offsetY + j * CELL_SIZE);
                let cx = x + CELL_SIZE / 2;
                let cy = y + CELL_SIZE / 2;
                let vy = cy + (CELL_SIZE * 0.06); // Vertically centered, nudged down slightly for visual balance

                // 吏?뺣맂 諛앷린(Threshold)蹂대떎 諛앹? ?쎌?? ?뚮뜑留?臾댁떆 (?쇰? ?덇났 利앸컻)
                let currentThreshold = darknessThreshold; // 0.12
                
                // --- Temporal Dot Logic ---
                if (darkness > currentThreshold) {
                    dotLife[cellIdx] = 1.0; // Surface is present, keep dot energy full
                } else {
                    dotLife[cellIdx] *= 0.85; // Rapid decay when surface disappears
                }

                if (darkness <= currentThreshold) {
                    // Only draw dot if it was recently part of a surface (decaying)
                    if (dotLife[cellIdx] > 0.01) {
                        ctx.save();
                        ctx.globalAlpha = dotLife[cellIdx] * 0.9;
                        // ?먯쓽 ?ш린瑜??ㅼ슦怨???援듦쾶 蹂댁씠?꾨줉 議곗젙
                        ctx.font = `400 ${Math.round(CELL_SIZE * 0.45 * dotLife[cellIdx])}px JetBrains Mono`;
                        ctx.fillStyle = colorSymbol; // Use dedicated symbol color
                        ctx.fillText('·', cx, vy);
                        ctx.restore();
                    }
                    continue;
                }
                // --------------------------

                let vLinear = (darkness - currentThreshold) / (1.0 - currentThreshold);
                vLinear = Math.min(1.0, Math.max(0.0, vLinear));

                let v = Math.pow(vLinear, contrastPow);
                
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = CELL_SIZE >= 30 ? 2 : 1;
                
                const fx = Math.floor(x), fy = Math.floor(y);
                const fw = Math.ceil(CELL_SIZE), fh = Math.ceil(CELL_SIZE);

                // --- ?렞 NEW: High Performance Phase Comparison (Linear) ---
                // Compare with vLinear BEFORE contrastPow to ensure consistent responsiveness
                let dist = Math.abs(vLinear - bluePhase);
                let z1Limit = zone1Limit; // Use the slider-controlled variable directly
                
                // 1?쒖쐞: 媛???대몢????꾩슦??釉붾（ ?ㅻ씪瑜?臾댁떆?섍퀬 臾댁“嫄???釉붾옓 諛뺤뒪濡??좎? (癒몃━移대씫 ??
                if (v >= 0.88) {
                    ctx.fillStyle = colorZ4;
                    ctx.fillRect(fx, fy, fw, fh);
                }
                // 2?쒖쐞: ZONE 1 Key Color Point ??glowing soft blend (?덇꼍?? ?ㅺ낸????
                else if (dist < z1Limit) {
                    let intensity = 1.0 - (dist / z1Limit); // 1.0 at center, 0.0 at edge
                    intensity = Math.pow(intensity, 2.0); // Sharper falloff curve
                    
                    let baseR, baseG, baseB;
                    if (gradientMode) {
                        let c = lerpColor(gradientFrom, gradientTo, gradientT);
                        let m = c.match(/\d+/g);
                        baseR = parseInt(m[0]); baseG = parseInt(m[1]); baseB = parseInt(m[2]);
                    } else {
                        let rgb = hexToRgb(keyColor);
                        baseR = rgb[0]; baseG = rgb[1]; baseB = rgb[2];
                    }
                    
                    // Blend block from Light Zone (ambient) to Pure Color (core)
                    let fillR = Math.round(baseR * intensity + rgbZ2[0] * (1 - intensity));
                    let fillG = Math.round(baseG * intensity + rgbZ2[1] * (1 - intensity));
                    let fillB = Math.round(baseB * intensity + rgbZ2[2] * (1 - intensity));
                    
                    ctx.fillStyle = `rgb(${fillR}, ${fillG}, ${fillB})`;
                    ctx.fillRect(fx, fy, fw, fh);

                    // Inject Structural Symbols (20% ratio)
                    if (intensity > 0.4 && (i * 11 + j * 17 + Math.floor(globalFrame/60)) % 10 < 2) {
                        ctx.save();
                        ctx.beginPath(); ctx.rect(fx, fy, fw, fh); ctx.clip();
                        ctx.fillStyle = `rgba(${rgbSymbol[0]}, ${rgbSymbol[1]}, ${rgbSymbol[2]}, ${intensity})`; 
                        let symIdx = ((Math.floor(i) * 6271 + Math.floor(j) * 3181 + Math.floor(globalFrame/90) * 7919) % activeSymbols.length + activeSymbols.length) % activeSymbols.length;
                        ctx.fillText(activeSymbols[symIdx], cx, vy);
                        ctx.restore();
                    } else {
                        // Standard typography fading away as it gets close to core
                        ctx.save();
                        ctx.beginPath(); ctx.rect(fx, fy, fw, fh); ctx.clip();
                        // Text uses user's selected text color, fading opacity towards core
                        let rowOffset = Math.floor(j) * 17;
                        let charIdx = (Math.floor(i) + rowOffset) % TEXT_FLOW.length;
                        let char = mosaicMode
                            ? activeSymbols[((Math.floor(i) * 5381 + Math.floor(j) * 2749 + Math.floor(globalFrame/90) * 7919) % activeSymbols.length + activeSymbols.length) % activeSymbols.length]
                            : TEXT_FLOW[charIdx % TEXT_FLOW.length];

                        // --- ?렞 Color Logic: Letters vs Symbols ---
                        let isLetter = /[a-zA-Z]/.test(char);
                        if (isLetter) {
                            ctx.fillStyle = `rgba(${rgbText[0]}, ${rgbText[1]}, ${rgbText[2]}, ${1.0 - intensity * 0.85})`;
                        } else {
                            ctx.fillStyle = `rgba(${rgbSymbol[0]}, ${rgbSymbol[1]}, ${rgbSymbol[2]}, ${1.0 - intensity * 0.85})`;
                        }
                        ctx.fillText(char, cx, vy);
                        ctx.restore();
                    }
                }
                // 3?쒖쐞: 諛앹? ?곸뿭 (?쇰?, 紐명넻) - ??댄룷洹몃옒??+ 鍮?諛뺤뒪
                else if (v < 0.72) {
                    ctx.fillStyle = colorZ2;
                    ctx.fillRect(fx, fy, fw, fh);
                    ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
                    ctx.save();
                    ctx.beginPath(); ctx.rect(fx, fy, fw, fh); ctx.clip();
                    let rowOffset = Math.floor(j) * 17;
                    let charIdx = (Math.floor(i) + rowOffset) % TEXT_FLOW.length;
                    let char = mosaicMode
                        ? activeSymbols[((Math.floor(i) * 6271 + Math.floor(j) * 3181 + Math.floor(globalFrame/90) * 7919) % activeSymbols.length + activeSymbols.length) % activeSymbols.length]
                        : TEXT_FLOW[charIdx % TEXT_FLOW.length];

                    // --- ?렞 Color Logic: Letters vs Symbols ---
                    ctx.fillStyle = /[a-zA-Z]/.test(char) ? colorText : colorSymbol;
                    ctx.fillText(char, cx, vy);
                    ctx.restore();
                }
                // 4?쒖쐞: 以묎컙 諛앷린 (?뚯쁺) - 洹몃젅??諛뺤뒪 + ASCII
                else {
                    ctx.fillStyle = colorZ3;
                    ctx.fillRect(fx, fy, fw, fh);
                    ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
                    ctx.save();
                    ctx.beginPath(); ctx.rect(fx, fy, fw, fh); ctx.clip();
                    ctx.fillStyle = colorSymbol; // Symbols always use SYMBOL color here
                    // Frame-based symbol index - doesn't flicker with video motion
                    let charIdx = ((Math.floor(i) * 5381 + Math.floor(j) * 2749 + Math.floor(globalFrame/90) * 7919) % activeSymbols.length + activeSymbols.length) % activeSymbols.length;
                    let char = activeSymbols[charIdx];
                    ctx.fillText(char, cx, vy);
                    ctx.restore();
                }
            }
        }

        // Post-Processing: Perfectly Stable Map

        // Gradient pingpong between from?뭪o colors
        if (gradientMode) {
            gradientT += 0.008 * gradientDir;
            if (gradientT >= 1) { gradientT = 1; gradientDir = -1; }
            else if (gradientT <= 0) { gradientT = 0; gradientDir = 1; }
        }

        // FPS
        globalFrame++;
        frameCounter++;
        now = performance.now();
        if (now - lastFpsTime > 500) {
            fpsDisplay = Math.round(frameCounter / ((now - lastFpsTime) / 1000));
            frameCounter = 0;
            lastFpsTime = now;
        }
        document.getElementById('hud-grid').textContent = `GRID ${cols}×${rows} (${Math.round(CELL_SIZE)}px)`;
        document.getElementById('hud-fps').textContent = `${fpsDisplay} FPS`;
        document.getElementById('hud-hand').textContent = pinchDistance >= 0
            ? `PINCH: ${Math.round(pinchDistance)}px` : 'NO HAND';

        requestAnimationFrame(renderLoop);
    }

    // ==========================================================
    // MEDIAPIPE
    // ==========================================================
    function toggleWebcam() {
        let btn = document.getElementById('webcam-toggle');
        if (webcamActive) {
            stopWebcam(); btn.innerHTML = '<span>⚡</span> HAND CONTROL: OFF'; btn.classList.remove('active');
        } else {
            startWebcam(); btn.innerHTML = '<span>⚡</span> HAND CONTROL: ON'; btn.classList.add('active');
        }
    }
    function startWebcam() {
        webcamActive = true;
        webcamVideo = document.createElement('video');
        webcamVideo.setAttribute('playsinline', '');
        webcamVideo.setAttribute('autoplay', '');
        webcamVideo.setAttribute('muted', '');
        webcamVideo.muted = true;
        webcamVideo.style.display = 'none';
        document.body.appendChild(webcamVideo);
        mpHands = new Hands({
            locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${f}`
        });
        mpHands.setOptions({ maxNumHands: 1, modelComplexity: 0, minDetectionConfidence: 0.6, minTrackingConfidence: 0.5 });
        mpHands.onResults(onHandResults);
        mpCamera = new Camera(webcamVideo, {
            onFrame: async () => { if (webcamActive && mpHands) await mpHands.send({ image: webcamVideo }); },
            facingMode: 'user',
            width: 320, height: 240
        });
        mpCamera.start().catch(err => {
            alert('移대찓??沅뚰븳???덉슜?댁＜?몄슂! (Camera start failed: ' + err + ')');
            toggleWebcam();
        });
    }
    function stopWebcam() {
        webcamActive = false; pinchDistance = -1; targetCellSize = 150;
        if (mpCamera) { mpCamera.stop(); mpCamera = null; }
        if (webcamVideo) { webcamVideo.srcObject?.getTracks().forEach(t => t.stop()); webcamVideo.remove(); webcamVideo = null; }
    }
    function onHandResults(results) {
        if (!results.multiHandLandmarks || !results.multiHandLandmarks.length) { pinchDistance = -1; return; }
        let lm = results.multiHandLandmarks[0];
        let dx = (lm[4].x - lm[8].x) * 320, dy = (lm[4].y - lm[8].y) * 240;
        pinchDistance = Math.sqrt(dx * dx + dy * dy);
        targetCellSize = Math.round(lerp(12, 150, clamp((pinchDistance - 15) / 140, 0, 1)));
    }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function clamp(v, mn, mx) { return Math.min(mx, Math.max(mn, v)); }

    document.addEventListener('keydown', (e) => {
        if (e.key === '+' || e.key === '=') targetCellSize = Math.min(150, targetCellSize + 5);
        else if (e.key === '-' || e.key === '_') targetCellSize = Math.max(12, targetCellSize - 5);
    });
    
    document.addEventListener('wheel', (e) => {
        document.getElementById('tutorial-toast').style.opacity = '0';
        if (!webcamActive) {
            if (e.deltaY < 0) {
                targetCellSize = Math.min(150, targetCellSize + 5);
            } else if (e.deltaY > 0) {
                targetCellSize = Math.max(12, targetCellSize - 5);
            }
        }
    }, { passive: true });

    // Touch event listeners for mobile gesture mapping
    let initialPinchDist = null;
    let initialCellSize = 0;
    let lastTouchY = null;

    window.addEventListener('touchstart', (e) => {
        if (!webcamActive) {
            if (e.touches.length === 1) {
                lastTouchY = e.touches[0].pageY;
            } else if (e.touches.length === 2) {
                e.preventDefault();
                let dx = e.touches[0].pageX - e.touches[1].pageX;
                let dy = e.touches[0].pageY - e.touches[1].pageY;
                initialPinchDist = Math.hypot(dx, dy);
                initialCellSize = targetCellSize;
            }
        }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
        if (!webcamActive) {
            if (e.touches.length === 1 && lastTouchY !== null) {
                e.preventDefault();
                document.getElementById('tutorial-toast').style.opacity = '0';
                let dy = e.touches[0].pageY - lastTouchY;
                lastTouchY = e.touches[0].pageY;
                targetCellSize = Math.max(12, Math.min(150, targetCellSize + dy * 0.3));
            } 
            else if (e.touches.length === 2 && initialPinchDist !== null) {
                e.preventDefault();
                document.getElementById('tutorial-toast').style.opacity = '0';
                let dx = e.touches[0].pageX - e.touches[1].pageX;
                let dy = e.touches[0].pageY - e.touches[1].pageY;
                let scale = Math.hypot(dx, dy) / initialPinchDist; 
                targetCellSize = Math.max(12, Math.min(150, initialCellSize / scale));
            }
        }
    }, { passive: false });

    window.addEventListener('touchend', (e) => {
        if (e.touches.length < 2) initialPinchDist = null;
        if (e.touches.length < 1) lastTouchY = null;
    });

    // ==========================================================
    // RECORDING
    // ==========================================================
    function toggleRecording() {
        if (!mediaRecorder || mediaRecorder.state === 'inactive') {
            startRecording();
        } else {
            stopRecording();
        }
    }

    function startRecording() {
        let stream = canvas.captureStream(60);
        let mimeType = 'video/webm';
        let extension = 'webm';
        
        if (MediaRecorder.isTypeSupported('video/mp4; codecs="avc1.424028, mp4a.40.2"')) {
            mimeType = 'video/mp4; codecs="avc1.424028, mp4a.40.2"';
            extension = 'mp4';
        } else if (MediaRecorder.isTypeSupported('video/mp4')) {
            mimeType = 'video/mp4';
            extension = 'mp4';
        } else if (MediaRecorder.isTypeSupported('video/webm; codecs=h264')) {
            mimeType = 'video/webm; codecs=h264';
            extension = 'mp4';
        }

        mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType });
        mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
        mediaRecorder.onstop = () => {
            let blob = new Blob(recordedChunks, { type: mimeType });
            recordedChunks = [];
            let url = URL.createObjectURL(blob);
            let a = document.createElement('a'); 
            a.style.display = 'none'; a.href = url;
            a.download = `cosmic_ascii_${Date.now()}.${extension}`;
            document.body.appendChild(a); a.click();
            setTimeout(() => { window.URL.revokeObjectURL(url); a.remove(); }, 100);
        };
        mediaRecorder.start();
        let btn = document.getElementById('record-btn');
        btn.textContent = '⏺ REC (CLICK TO SAVE)';
        btn.classList.add('active');
    }

    function stopRecording() {
        if(mediaRecorder) mediaRecorder.stop();
        let btn = document.getElementById('record-btn');
        btn.textContent = '⏺ REC VIDEO';
        btn.classList.remove('active');
    }

    // ==========================================================
    // SETTINGS PANEL
    // ==========================================================
    function toggleSettings() {
        let panel = document.getElementById('settings-panel');
        let btn = document.getElementById('settings-toggle');
        let isOpen = panel.classList.toggle('open');
        
        // --- 🎯 Emergency Force Reveal for Toggle Button ---
        if (!isOpen) {
            btn.style.setProperty('display', 'flex', 'important');
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
        } else {
            btn.style.setProperty('display', 'none', 'important');
        }
    }
    function applyFont(val) {
        currentFont = val;
    }
    function applyCharSet(val) {
        if (CHAR_SETS[val]) {
            activeSymbols = CHAR_SETS[val];
            mosaicMode = (val === 'mosaic');
        }
    }
    function applyText(val) {
        // 줄 단위로 분리 → 줄 안 단어는 1칸, 줄 사이는 10칸 → 2회 반복으로 flow 구성
        const LINE_GAP = '          '; // 10 spaces
        let lines = val.split(/[\n\r]+/).map(l => l.trim().split(/\s+/).filter(w => w.length > 0).join(' ')).filter(l => l.length > 0);
        if (lines.length === 0) { TEXT_FLOW = ' '; return; }
        let unit = lines.join(LINE_GAP) + LINE_GAP;
        TEXT_FLOW = unit + unit;
    }
    function applyColor(val) {
        keyColor = val;
        document.getElementById('color-hex').textContent = val.toUpperCase();
        document.getElementById('color-hex').style.color = val;
        
        // --- Material 3 Dynamic UI Hook ---
        let [r,g,b] = hexToRgb(val);
        let [h,s,l] = rgbToHsl(r,g,b);
        let accentContainer = hslToHex(h, Math.min(s, 25), 92); // M3 Container Tint
        document.documentElement.style.setProperty('--accent-primary', val);
        document.documentElement.style.setProperty('--accent-container', accentContainer);
        document.documentElement.style.setProperty('--on-accent-container', val);
        
        updateBgSwatches();
    }
    function applyZone1(val) {
        zone1Limit = parseFloat(val);
        document.getElementById('zone1-val').textContent = Math.round(val * 100) + '%';
        let slider = document.getElementById('ctrl-zone1');
        if (slider) slider.value = val;
    }
    function applyContrast(val) {
        updatePhaseUI(val);
        if (autoPhase) {
            document.getElementById('ctrl-auto-phase').checked = false;
            autoPhase = false;
        }
    }
    function applyAutoPhase(checked) {
        autoPhase = checked;
        if (!checked) {
            bluePhase = basePhase; // Restore position when unchecked
            document.getElementById('ctrl-contrast').value = basePhase;
        }
    }
    function applyGradient(checked) {
        gradientMode = checked;
        document.getElementById('ctrl-color').disabled = checked;
        document.getElementById('color-hex').style.opacity = checked ? '0.3' : '1';
        document.getElementById('gradient-controls').style.display = checked ? 'block' : 'none';
    }
    function applyGradientColors() {
        let from = document.getElementById('ctrl-grad-from').value;
        let to = document.getElementById('ctrl-grad-to').value;
        gradientFrom = hexToRgb(from);
        gradientTo = hexToRgb(to);
        document.getElementById('gradient-bar').style.background = `linear-gradient(to right, ${from}, ${to})`;
    }
    function applyBg(val) {
        bgColor = val;
        document.getElementById('bg-hex').textContent = val.toUpperCase();
        document.getElementById('ctrl-bg').value = val;
    }
    
    function applyPalette(target, val) {
        if (target === 'z2') { colorZ2 = val; rgbZ2 = hexToRgb(val); }
        else if (target === 'z3') { colorZ3 = val; }
        else if (target === 'z4') { colorZ4 = val; }
        else if (target === 'txt') { colorText = val; rgbText = hexToRgb(val); }
        else if (target === 'sym') { colorSymbol = val; rgbSymbol = hexToRgb(val); }
    }

    function rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        let max = Math.max(r,g,b), min = Math.min(r,g,b), h, s, l = (max+min)/2;
        if (max === min) { h = s = 0; }
        else {
            let d = max - min;
            s = l > 0.5 ? d/(2-max-min) : d/(max+min);
            switch(max) {
                case r: h = ((g-b)/d + (g<b?6:0))/6; break;
                case g: h = ((b-r)/d + 2)/6; break;
                case b: h = ((r-g)/d + 4)/6; break;
            }
        }
        return [h*360, s*100, l*100];
    }

    function hslToHex(h, s, l) {
        h /= 360; s /= 100; l /= 100;
        let r, g, b;
        if (s === 0) { r = g = b = l; }
        else {
            const q = l < 0.5 ? l*(1+s) : l+s-l*s, p = 2*l-q;
            const hue2rgb = (p,q,t) => { if(t<0)t+=1; if(t>1)t-=1; if(t<1/6)return p+(q-p)*6*t; if(t<1/2)return q; if(t<2/3)return p+(q-p)*(2/3-t)*6; return p; };
            r = hue2rgb(p,q,h+1/3); g = hue2rgb(p,q,h); b = hue2rgb(p,q,h-1/3);
        }
        return '#' + [r,g,b].map(x=>Math.round(x*255).toString(16).padStart(2,'0')).join('');
    }

    function updateBgSwatches() {
        let [r,g,b] = hexToRgb(keyColor);
        let [h, s] = rgbToHsl(r, g, b);
        // 5 tonal suggestions: very light ??light ??mid-dark ??dark ??very dark
        const tones = [
            [h, Math.min(s*0.25, 20), 97],   // near-white surface
            [h, Math.min(s*0.4, 35),  88],   // light tint
            [h, Math.min(s*0.5, 45),  75],   // medium tint
            [h, Math.min(s*0.5, 40),  20],   // dark
            [h, Math.min(s*0.3, 25),  10],   // very dark
        ];
        let container = document.getElementById('bg-swatches');
        container.innerHTML = '';
        tones.forEach(([th, ts, tl]) => {
            let hex = hslToHex(th, ts, tl);
            let sw = document.createElement('div');
            sw.style.cssText = `width:28px;height:20px;background:${hex};border:1px solid #ccc;cursor:pointer;border-radius:2px;`;
            sw.title = hex;
            sw.onclick = () => applyBg(hex);
            container.appendChild(sw);
        });
    }

    window.addEventListener('DOMContentLoaded', () => { 
        init(); 
        updateBgSwatches(); 
        
        // --- ?? Premium UI Intro (HUD/Buttons) ---
        // Ensure buttons and HUD are setup, but avoid auto-opening menus until video loads
    });
    
    // Manual touch scroll for settings panel (canvas touch-action:none blocks CSS scroll on mobile)
    (function() {
        let panel, startY = 0, startScrollTop = 0;
        document.addEventListener('DOMContentLoaded', () => {
            panel = document.getElementById('settings-panel');
            if (!panel) return;
            panel.addEventListener('touchstart', (e) => {
                startY = e.touches[0].pageY;
                startScrollTop = panel.scrollTop;
            }, {passive: true});
            panel.addEventListener('touchmove', (e) => {
                if (!panel.classList.contains('open')) return;
                let delta = startY - e.touches[0].pageY;
                panel.scrollTop = startScrollTop + delta;
            }, {passive: false});
        });
    })();
    
    // ═══ ZONE DRAG: drag the blue zone boundary directly on canvas ═══
    (function() {
        let handle = null, isDragging = false;

        function positionHandle() {
            handle = handle || document.getElementById('zone-drag-handle');
            if (!handle || !canvas) return;
            let rect = canvas.getBoundingClientRect();
            let phase = window.bluePhase || 0;
            // Zone is horizontal: phaseLimit controls left-to-right width
            // Map phase (0-1) to canvas x position
            handle.style.display = 'block';
            handle.style.top = 'auto';
            handle.style.bottom = 'auto';
            // Actually phase controls the LEFT zone width (column-based)
            // Show as vertical line at x = phase * canvas width
            handle.style.height = rect.height + 'px';
            handle.style.width = '6px';
            handle.style.top = rect.top + 'px';
            handle.style.left = (rect.left + phase * rect.width) + 'px';
        }

        function startDrag(clientX, clientY) {
            isDragging = true;
            moveDrag(clientX, clientY);
        }

        function moveDrag(clientX, clientY) {
            if (!isDragging || !canvas) return;
            let rect = canvas.getBoundingClientRect();
            let relX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
            updatePhaseUI(relX);
            positionHandle();
        }

        document.addEventListener('DOMContentLoaded', () => {
            handle = document.getElementById('zone-drag-handle');
            if (!handle) return;

            // Mouse
            handle.addEventListener('mousedown', (e) => { startDrag(e.clientX, e.clientY); e.preventDefault(); }, {passive:false});
            document.addEventListener('mousemove', (e) => { if (isDragging) moveDrag(e.clientX, e.clientY); });
            document.addEventListener('mouseup', () => { isDragging = false; });

            // Touch
            handle.addEventListener('touchstart', (e) => { startDrag(e.touches[0].clientX, e.touches[0].clientY); }, {passive:true});
            document.addEventListener('touchmove', (e) => { if (isDragging) moveDrag(e.touches[0].clientX, e.touches[0].clientY); }, {passive:true});
            document.addEventListener('touchend', () => { isDragging = false; });
        });

        // Expose for renderLoop to call after resize
        window.positionZoneHandle = positionHandle;
    })();
    
    // ═══ SPEECH-TO-TEXT (STT) ═══
    let recognition;
    let sttActive = false;
    let sttFinalBuffer = "WE ARE COSMIC "; // initial backup string

        function initSTT() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
            alert(isIOS
                ? "iOS Safari에서는 마이크 권한이 제한될 수 있습니다.\nSafari 설정 > 개인 정보 보호 > 마이크를 허용하거나, Chrome 앱을 사용해주세요."
                : "음성 인식은 Chrome 브라우저에서 지원됩니다.");
            document.getElementById("stt-toggle").checked = false;
            return false;
        }

        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "ko-KR";

        recognition.onstart = () => {
            sttActive = true;
            document.getElementById("ctrl-text").disabled = true;
            document.getElementById("ctrl-text").style.opacity = "0.5";
            document.getElementById("ctrl-text").value = "마이크 듣는 중... 🎙️";
        };

        recognition.onresult = (event) => {
            let interimTranscript = "";
            let finalTranscript = "";
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript + " ";
                else interimTranscript += event.results[i][0].transcript;
            }
            if (finalTranscript) sttFinalBuffer = finalTranscript;
            let activeSpeech = interimTranscript.trim() ? interimTranscript : sttFinalBuffer;
            if (activeSpeech.trim().length > 0) {
                let unit = activeSpeech.toUpperCase() + "        ";
                TEXT_FLOW = unit + unit + unit;
                document.getElementById("ctrl-text").value = activeSpeech;
            }
        };

        recognition.onerror = (event) => {
            console.error("STT error:", event.error);
            if (event.error === "not-allowed" || event.error === "service-not-allowed") {
                const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
                alert(isIOS
                    ? "iOS 마이크 권한 거부됨.\n설정 앱 > Safari 또는 Chrome > 마이크를 '허용'으로 바꿔주세요."
                    : "마이크 권한이 거부됨.\n브라우저 주소창의 🔒 아이콘 > 마이크 허용 후 다시 시도해주세요.");
                toggleSTT(false);
            }
            // no-speech, network errors: silent - auto-restart via onend
        };

        recognition.onend = () => {
            if (sttActive) setTimeout(() => { try { recognition.start(); } catch(e){} }, 300);
        };

        return true;
    }

    function toggleSTT(activate) {
        const toggle = document.getElementById("stt-toggle");
        if (activate) {
            if (!recognition && !initSTT()) return;
            try { recognition.start(); sttActive = true; } catch(e) {}
        } else {
            sttActive = false;
            if (recognition) { try { recognition.stop(); } catch(e) {} }
            if (toggle) toggle.checked = false;
            document.getElementById("ctrl-text").disabled = false;
            document.getElementById("ctrl-text").style.opacity = "1";
            document.getElementById("ctrl-text").value = "WE ARE NOT RAY\nWE ARE COSMIC";
            applyText(document.getElementById("ctrl-text").value);
        }
    }
    // ═══ WHISPER AI VIDEO SYNC ═══
    window.videoTranscripts = [];
    let whisperWorker = null;
    function showAIToast(text) {
        let toast = document.getElementById("ai-toast");
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "ai-toast";
            toast.style.cssText = "position:absolute; top:20px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.8); color:#fff; padding:10px 20px; border-radius:30px; font-size:12px; font-weight:700; z-index:9999; letter-spacing:1px; font-family:'JetBrains Mono', monospace;";
            document.body.appendChild(toast);
        }
        toast.innerText = text;
        toast.style.display = 'block';
    }
    
    async function extractAudioFloat32Array(file) {
        let audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        let arrayBuffer = await file.arrayBuffer();
        let audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        return audioBuffer.getChannelData(0); 
    }

    async function startVideoAI(file) {
        window.videoTranscripts = [];
        showAIToast("⏳ EXTRACTING AUDIO...");
        let audioArray;
        try {
            audioArray = await extractAudioFloat32Array(file);
        } catch(e) {
            console.error("Audio extraction failed", e);
            let toast = document.getElementById("ai-toast");
            if(toast) toast.style.display = 'none';
            return;
        }

        showAIToast("⏳ LOADING AI MODEL (40MB)...");
        if (!whisperWorker) {
            whisperWorker = new Worker('whisper_worker.js', { type: 'module' });
        }
        
        whisperWorker.onmessage = (e) => {
            let msg = e.data;
            if (msg.status === 'ready') {
                showAIToast("⏳ TRANSCRIBING AUDIO...");
                whisperWorker.postMessage({ type: 'transcribe', audio: audioArray });
            } else if (msg.status === 'progress') {
                if(msg.progress && msg.progress.progress) showAIToast(`⏳ DOWNLOADING: ${Math.round(msg.progress.progress)}%`);
            } else if (msg.status === 'complete') {
                window.videoTranscripts = msg.result.chunks || [];
                showAIToast("✅ AI SYNC COMPLETE");
                setTimeout(() => { document.getElementById("ai-toast").style.display = 'none'; }, 2000);
            } else if (msg.status === 'error') {
                showAIToast("❌ AI ERROR: " + msg.error);
                setTimeout(() => { document.getElementById("ai-toast").style.display = 'none'; }, 3000);
            }
        };

        whisperWorker.postMessage({ type: 'load' });
    }

    async function tryExperienceVideo() {
        let btn = document.querySelector('button[onclick="tryExperienceVideo()"]');
        if (btn) btn.innerText = "LOADING...";
        try {
            let res = await fetch('./experience.mp4');
            let blob = await res.blob();
            let file = new File([blob], 'experience.mp4', {type: 'video/mp4'});
            loadVideo(file);
        } catch (e) {
            alert("EXPERIENCE VIDEO FAILED TO LOAD");
            if (btn) btn.innerText = "EXPERIENCE";
        }
    }
