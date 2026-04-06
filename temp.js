
    // ==========================================================
    // COSMIC ASCII ENGINE v4
    // ==========================================================

    const TEXT_FLOW = 'WE ARE NOT RAY        WE ARE NOT RAY            WE ARE COSMIC           ';

    let CELL_SIZE = 150;
    let targetCellSize = 150;

    let canvas, ctx;
    let video = null;
    let offCanvas, offCtx;
    let cols = 0, rows = 0;
    let isPlaying = false;
    let frameCounter = 0, globalFrame = 0;
    let lastFpsTime = performance.now();
    let fpsDisplay = 0;
    let lastRenderTime = 0;

    // MediaPipe
    let mpHands = null, mpCamera = null;
    let webcamActive = false, webcamVideo = null;
    let pinchDistance = -1;

    // Recording
    let mediaRecorder = null;
    let recordedChunks = [];

    // Intro
    let isIntro = false;
    let introStartTime = 0;
    let hasPlayedIntro = false;

    // Artwork Modes
    let currentMode = 0;
    const MODE_NAMES = [
        'BASIC TYPE',
        'M3 MONOCHROMATIC',
        'KINETIC WATERFALL',
        'GLITCH DISPLACE',
        'ORGANIC BREATHE'
    ];
    const NUM_MODES = 5;

    // M3 Monochromatic Blue Palette (Tone 99, 80, 50, 40, 20, 10)
    const M3_BG = '#FAFAFF';        // Tone 99
    const M3_MID_BG = '#BBC3FF';    // Tone 80
    const M3_PRIMARY = '#2B35FF';   // Tone 40
    const M3_MID_TEXT = '#000A85';  // Tone 20
    const M3_DEEP = '#00003E';      // Tone 10
    const M3_HIGHLIGHT = '#505BFF'; // Tone 50

    // ==========================================================
    function init() {
        canvas = document.getElementById('ascii-canvas');
        ctx = canvas.getContext('2d');
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
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

    function resizeCanvas() {
        canvas.width = CANVAS_W;
        canvas.height = CANVAS_H;
        calcGrid();
    }

    function calcGrid() {
        cols = Math.floor(canvas.width / CELL_SIZE);
        rows = Math.floor(canvas.height / CELL_SIZE);
        if (!offCanvas) {
            offCanvas = document.createElement('canvas');
            offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
        }
        offCanvas.width = cols;
        offCanvas.height = rows;
    }

    function tryLocalVideo() { 
        document.querySelector('button[onclick="tryLocalVideo()"]').innerText = "LOADING...";
        loadVideo('choi_insta.mp4'); 
    }

    function loadVideo(src) {
        if (video) { video.pause(); video.remove(); }
        video = document.createElement('video');
        video.src = typeof src === 'string' ? src : URL.createObjectURL(src);
        video.autoplay = true; video.loop = true; video.muted = true; video.playsInline = true;

        video.addEventListener('canplay', () => {
            document.getElementById('ui-layer').style.display = 'none';
            document.getElementById('controls-container').style.display = 'flex';
            
            if (!hasPlayedIntro) {
                hasPlayedIntro = true;
                let toast = document.getElementById('tutorial-toast');
                toast.style.opacity = '1';
                setTimeout(() => { toast.style.opacity = '0'; }, 8000);
                
                isIntro = true;
                introStartTime = performance.now() + 500;
            }

            let playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise.catch(err => { console.warn("Auto-play blocked", err); });
            }
            isPlaying = true;
            requestAnimationFrame(renderLoop);
        });
        video.addEventListener('error', () => {
            alert('Video load failed. Use SELECT VIDEO to choose the file.');
        });
        video.load();
    }

    // ==========================================================
    // RENDER
    // ==========================================================
    function renderLoop() {
        if (!isPlaying) return;
        let now = performance.now();

        // Loop guard: jump back before the video hits black tail frames
        if (video && video.duration > 1.0) {
            if (video.currentTime >= video.duration - 0.3) {
                video.currentTime = 0.1;
            }
        }

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
                targetFrameDelay = 125 + (42 - 125) * t; // 8fps → 24fps
            } else {
                isIntro = false;
                targetCellSize = 12;
            }
        } else {
            if (Math.abs(CELL_SIZE - targetCellSize) > 0.1) {
                CELL_SIZE = CELL_SIZE * 0.90 + targetCellSize * 0.10;
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

        // Draw video to offscreen — SKIP if video is seeking (prevents black flash)
        if (video && video.readyState >= 2 && !video.seeking) {
            let vR = video.videoWidth / video.videoHeight;
            let cR = cols / rows;
            let dW, dH, dX, dY;
            if (cR > vR) {
                dW = cols; dH = cols / vR; dX = 0; dY = (rows - dH) / 2;
            } else {
                dH = rows; dW = rows * vR; dY = 0; dX = (cols - dW) / 2;
            }
            offCtx.fillStyle = '#FFF';
            offCtx.fillRect(0, 0, cols, rows);
            offCtx.drawImage(video, dX, dY, dW, dH);
        }

        let imageData;
        try { imageData = offCtx.getImageData(0, 0, cols, rows); }
        catch(e) { requestAnimationFrame(renderLoop); return; }
        let pixels = imageData.data;

        // Prepare temporary canvas for Metaball/Post-process effects
        if (!metaCanvas || metaCanvas.width !== canvas.width || metaCanvas.height !== canvas.height) {
            metaCanvas = document.createElement('canvas');
            metaCanvas.width = canvas.width;
            metaCanvas.height = canvas.height;
            metaCtx = metaCanvas.getContext('2d', { willReadFrequently: true });
        }

        // Mode 4 (Organic Breathe): Redirect drawing to metaCtx for blur fusion
        let drawCtx = currentMode === 4 ? metaCtx : ctx;
        
        // Clear background
        drawCtx.fillStyle = '#FFFFFF';
        drawCtx.fillRect(0, 0, canvas.width, canvas.height);

        let offsetX = (canvas.width - cols * CELL_SIZE) / 2;
        let offsetY = (canvas.height - rows * CELL_SIZE) / 2;

        let fontSize = Math.max(6, CELL_SIZE);
        drawCtx.font = `800 ${fontSize}px 'JetBrains Mono', 'Consolas', monospace`;
        drawCtx.textAlign = 'center';
        drawCtx.textBaseline = 'middle';

        for (let j = 0; j < rows; j++) {
            for (let i = 0; i < cols; i++) {
                let idx = (j * cols + i) * 4;
                let r = pixels[idx], g = pixels[idx+1], b = pixels[idx+2];

                let luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
                let darkness = 1.0 - luma;

                let x = offsetX + i * CELL_SIZE;
                let y = offsetY + j * CELL_SIZE;
                let cx = x + CELL_SIZE / 2;
                let cy = y + CELL_SIZE / 2;

                if (darkness < 0.12) continue;

                let v = (darkness - 0.12) / 0.88;
                v = Math.min(1.0, Math.max(0.0, v));
                v = Math.pow(v, 2) * (3.0 - 2.0 * v); // S-curve
                
                let isM3 = currentMode > 0;
                drawCtx.strokeStyle = isM3 ? M3_DEEP : '#000000';
                drawCtx.lineWidth = CELL_SIZE >= 30 ? 2 : 1;

                // Coordinators
                let mx = x, my = y, mcx = cx, mcy = cy;
                
                // Mode 2: Kinetic Waterfall (Physical vertical scroll)
                if (currentMode === 2) {
                    let flowSpeed = 2.5; 
                    let fallDy = (globalFrame * flowSpeed) % (CELL_SIZE * 5); // Scroll chunk
                    my += fallDy; mcy += fallDy;
                    // Wrap around if it goes off bottom
                    if (my > canvas.height) {
                        my -= (rows * CELL_SIZE + CELL_SIZE * 5);
                        mcy -= (rows * CELL_SIZE + CELL_SIZE * 5);
                    }
                } 
                
                // Mode 4: Organic Sine Wave Breathing + Shape Modification
                let waveScale = 1.0;
                if (currentMode === 4) { 
                    let wave = Math.sin(mx * 0.003 + globalFrame * 0.02) * Math.cos(my * 0.003 + globalFrame * 0.02);
                    waveScale = 1.0 + wave * 0.8; // Expand drastically for organic merging
                    drawCtx.font = `800 ${Math.max(4, fontSize * waveScale)}px 'JetBrains Mono', 'Consolas', monospace`;
                }

                // Color Setup
                let colShadow = isM3 ? M3_DEEP : '#000000';
                let colMidBg = isM3 ? M3_MID_BG : '#808080';
                let colMidText = isM3 ? M3_MID_TEXT : '#000000';
                let colPrimaryText = isM3 ? M3_PRIMARY : '#000000';

                // AREA RENDERING
                if (v < 0.15) {
                    // ZONE 1: Highlight
                    if (currentMode === 0) {
                        let hash = (i * 7 + j * 13 + globalFrame) % 100;
                        drawCtx.fillStyle = hash < 2 ? '#ADFF2F' : '#0000FF';
                    } else {
                        drawCtx.fillStyle = M3_HIGHLIGHT;
                    }
                    if (currentMode === 4) { // Draw as organic circles in Mode 4
                        drawCtx.beginPath(); drawCtx.arc(mcx, mcy, CELL_SIZE * 0.6 * waveScale, 0, Math.PI*2); drawCtx.fill();
                    } else {
                        drawCtx.fillRect(Math.floor(mx), Math.floor(my), Math.ceil(CELL_SIZE), Math.ceil(CELL_SIZE));
                    }
                } else if (v < 0.80) {
                    // ZONE 2: Typography
                    if (currentMode !== 4) drawCtx.strokeRect(mx, my, CELL_SIZE, CELL_SIZE);
                    drawCtx.fillStyle = colPrimaryText;
                    let rowOffset = Math.floor(j) * 17; 
                    let charIdx = (Math.floor(i) + rowOffset) % TEXT_FLOW.length;
                    drawCtx.fillText(TEXT_FLOW[charIdx], mcx, mcy);
                } else if (v < 0.92) {
                    // ZONE 3: Grey/Mid + ASCII
                    drawCtx.fillStyle = colMidBg;
                    if (currentMode === 4) {
                        drawCtx.beginPath(); drawCtx.arc(mcx, mcy, CELL_SIZE * 0.4 * waveScale, 0, Math.PI*2); drawCtx.fill();
                    } else {
                        drawCtx.fillRect(Math.floor(mx), Math.floor(my), Math.ceil(CELL_SIZE), Math.ceil(CELL_SIZE));
                        drawCtx.strokeRect(mx, my, CELL_SIZE, CELL_SIZE);
                    }
                    drawCtx.fillStyle = colMidText;
                    let t = (v - 0.80) / 0.12;
                    let block = t < 0.2 ? '.' : t < 0.4 ? ':' : t < 0.6 ? '░' : t < 0.8 ? '▒' : '▓';
                    drawCtx.fillText(block, mcx, mcy);
                } else {
                    // ZONE 4: Deep Shadow
                    drawCtx.fillStyle = colShadow;
                    if (currentMode === 4) {
                        drawCtx.beginPath(); drawCtx.arc(mcx, mcy, CELL_SIZE * 0.5 * waveScale, 0, Math.PI*2); drawCtx.fill();
                    } else {
                        drawCtx.fillRect(Math.floor(mx), Math.floor(my), Math.ceil(CELL_SIZE), Math.ceil(CELL_SIZE));
                    }
                }

                // Reset font if altered
                if (currentMode === 4) {
                    drawCtx.font = `800 ${fontSize}px 'JetBrains Mono', 'Consolas', monospace`;
                }
            }
        }

        // Post-Processing for Mode 4 (Organic Breathe / Metaball)
        if (currentMode === 4) {
            ctx.filter = `blur(${Math.max(4, CELL_SIZE * 0.25)}px) contrast(30)`;
            ctx.drawImage(metaCanvas, 0, 0);
            ctx.filter = 'none';
        }

        // Post-Processing for Mode 3 (Glitch Displace)
        if (currentMode === 3 && globalFrame % 30 < 6) { // Glitch occurs periodically
            let glitchH = canvas.height * 0.15;
            let glitchY = Math.random() * (canvas.height - glitchH);
            let shiftX = (Math.random() - 0.5) * 80;
            
            // Draw a slice shifted
            ctx.drawImage(canvas, 0, glitchY, canvas.width, glitchH, shiftX, glitchY, canvas.width, glitchH);
            
            // RGB Split effect
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
            ctx.fillRect(0, glitchY, canvas.width, glitchH);
            ctx.drawImage(canvas, 0, glitchY, canvas.width, glitchH, -10, glitchY, canvas.width, glitchH);
            ctx.globalCompositeOperation = 'source-over';
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
        document.getElementById('hud-mode').textContent = `MODE: ${MODE_NAMES[currentMode]}`;
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
            stopWebcam(); btn.textContent = '⚡ HAND CONTROL: OFF'; btn.classList.remove('active');
        } else {
            startWebcam(); btn.textContent = '⚡ HAND CONTROL: ON'; btn.classList.add('active');
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
            alert('카메라 권한을 허용해주세요! (Camera start failed: ' + err + ')');
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
        else if (e.key === 'ArrowLeft') currentMode = (currentMode - 1 + NUM_MODES) % NUM_MODES;
        else if (e.key === 'ArrowRight') currentMode = (currentMode + 1) % NUM_MODES;
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
        btn.textContent = '🔴 REC (CLICK TO SAVE)';
        btn.classList.add('active');
    }

    function stopRecording() {
        if(mediaRecorder) mediaRecorder.stop();
        let btn = document.getElementById('record-btn');
        btn.textContent = '⏺ REC VIDEO';
        btn.classList.remove('active');
    }

    window.addEventListener('DOMContentLoaded', init);
    