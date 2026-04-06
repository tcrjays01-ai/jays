const fs = require('fs');
let html = fs.readFileSync('ascii_realtime.html', 'utf8');

// The JS functions that crash because their DOM elements were removed:
html = html.replace(/function applyColor([\s\S]*?)\}/g, 'function applyColor() {}');
html = html.replace(/function applyAutoPhase([\s\S]*?)\}/g, `function applyAutoPhase(checked) {
    autoPhase = checked;
    basePhase = parseFloat(document.getElementById('ctrl-contrast').value);
}`);
html = html.replace(/function applyGradientMode([\s\S]*?)\}/g, 'function applyGradientMode() {}');
html = html.replace(/function applyGradientColors([\s\S]*?)\}/g, 'function applyGradientColors() {}');
html = html.replace(/function applyPalette([\s\S]*?)\}/g, 'function applyPalette() {}');
html = html.replace(/function createSwatches([\s\S]*?)\}/g, 'function createSwatches() {}');

// Remove init() calls that trigger these crashing functions
html = html.replace(/createSwatches\(\);/g, '');
html = html.replace(/applyColor\(keyColor\);/g, '');
html = html.replace(/applyPalette\('z2', '#FFFFFF'\);/g, '');
html = html.replace(/applyPalette\('z3', '#808080'\);/g, '');
html = html.replace(/applyPalette\('z4', '#000000'\);/g, '');
html = html.replace(/applyPalette\('bg', '#FFFFFF'\);/g, '');

fs.writeFileSync('ascii_realtime.html', html, 'utf8');
