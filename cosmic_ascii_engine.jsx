/**
 * COSMIC - ASCII Generative Art Engine for After Effects (Phase 3)
 * Ported from Web Prototype by Antigravity Agent
 */

(function(thisObj) {
    function buildUI(container) {
        var panel = (container instanceof Panel) ? container : new Window("palette", "COSMIC ASCII ENGINE", undefined, {resizeable: true});
        
        panel.orientation = "column";
        panel.alignChildren = ["fill", "top"];
        panel.spacing = 10;
        panel.margins = 16;

        // --- Info Section ---
        var infoGrp = panel.add("group");
        infoGrp.orientation = "column";
        infoGrp.add("statictext", undefined, "1. Rename target layer to 'SOURCE_VIDEO'");
        infoGrp.add("statictext", undefined, "2. Set font to Courier New / 12pt");

        // --- Grid Settings ---
        var gridGrp = panel.add("group");
        gridGrp.add("statictext", undefined, "Cell Size (px):");
        var cellSizeInput = gridGrp.add("edittext", undefined, "24");
        cellSizeInput.characters = 5;

        // --- Action Button ---
        var genBtn = panel.add("button", undefined, "GENERATE GRID");
        
        // --- Progress ---
        var progBar = panel.add("progressbar", undefined, 0, 100);
        progBar.visible = false;

        genBtn.onClick = function() {
            var comp = app.project.activeItem;
            if (!(comp instanceof CompItem)) {
                alert("Please select a Composition first!");
                return;
            }

            var cellSize = parseInt(cellSizeInput.text);
            if (isNaN(cellSize) || cellSize < 8) {
                alert("Cell size must be at least 8px to prevent AE crash.");
                return;
            }

            var srcLayer = comp.layer("SOURCE_VIDEO");
            if (!srcLayer) {
                alert("Error: Layer named 'SOURCE_VIDEO' not found in Comp.");
                return;
            }

            var cols = Math.floor(comp.width / cellSize);
            var rows = Math.floor(comp.height / cellSize);
            var total = cols * rows;

            if (total > 5000) {
                if (!confirm("WARNING: Generating " + total + " layers may be slow. Continue?")) return;
            }

            app.beginUndoGroup("Cosmic ASCII Grid Generation");
            
            progBar.visible = true;
            progBar.value = 0;
            
            var asciiGroup = comp.layers.addShape();
            asciiGroup.name = "COSMIC_ASCII_CONTAINER";

            for (var y = 0; y < rows; y++) {
                for (var x = 0; x < cols; x++) {
                    var posX = x * cellSize + (cellSize / 2);
                    var posY = y * cellSize + (cellSize / 2);
                    
                    var txtLayer = comp.layers.addText(" ");
                    txtLayer.parent = asciiGroup;
                    txtLayer.property("Position").setValue([posX, posY]);
                    
                    // --- EXPRESSION: SOURCE TEXT ---
                    var srcTextExpr = 
                        "var src = thisComp.layer('SOURCE_VIDEO');\n" +
                        "var pos = [transform.position[0], transform.position[1]];\n" +
                        "var sampleSize = [" + cellSize + "," + cellSize + "];\n" +
                        "var rgb = src.sampleImage(pos, sampleSize);\n" +
                        "var luma = (0.299*rgb[0] + 0.587*rgb[1] + 0.114*rgb[2]);\n" +
                        "var chars = ' .YRATONEWE';\n" +
                        "var idx = Math.floor(luma * (chars.length - 1));\n" +
                        "chars[Math.min(chars.length-1, Math.max(0, idx))];";
                    
                    txtLayer.property("Source Text").expression = srcTextExpr;

                    // --- EXPRESSION: FILL COLOR ---
                    var fillColorExpr = 
                        "var src = thisComp.layer('SOURCE_VIDEO');\n" +
                        "var pos = [transform.position[0], transform.position[1]];\n" +
                        "var rgb = src.sampleImage(pos, ["+cellSize+","+cellSize+"]);\n" +
                        "var luma = (0.299*rgb[0] + 0.587*rgb[1] + 0.114*rgb[2]);\n" +
                        "var p1 = [8, 8, 26, 255]/255;\n" + // #08081a
                        "var peak = [0, 0, 255, 255]/255;\n" + // Pure Blue #0000FF
                        "linear(luma, 0, 1, p1, peak);";
                    
                    var fillProp = txtLayer.property("Contents").addProperty("ADBE Text Indexer").property("ADBE Text Fill Color");
                    // Note: Using standard Animator-based fill or simple expression selector
                    // For simplicity, we apply to character directly if using a Text Engine Script
                    // Standard way for many layers:
                    txtLayer.property("Fill Color").expression = fillColorExpr;
                }
                
                progBar.value = Math.floor((y / rows) * 100);
                app.refresh();
            }

            progBar.visible = false;
            app.endUndoGroup();
            alert("COSMIC Grid Generated: " + total + " layers created.");
        };

        panel.layout.layout(true);
        return panel;
    }

    var cosmicPanel = buildUI(thisObj);
    if (cosmicPanel instanceof Window) cosmicPanel.show();

})(this);
