import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import os
import sys
import time

# --- Config ---
INPUT_VIDEO = r"D:\@Work_2026\00_채용공고\src\choi.mp4"
OUTPUT_VIDEO = r"D:\@Work_2026\00_채용공고\src\choi_ascii_rendered.mp4"
CELL_SIZE = 12

# The text pattern to tile continuously
phrase = "wearenotray" 
phrase_upper = "WEARENOTRAY"

# Tameem Sankari Kinetic Blue Palette
palette_rgb = {
    'bg': (0, 0, 0),
    'c1': (0, 0, 5),
    'c2': (5, 10, 60),
    'c3': (10, 50, 200),
    'peak': (0, 150, 255),
    'glow': (200, 240, 255)
}

def map_color(val):
    if val < 0.25:
        a = val * 4
        return tuple(int(palette_rgb['bg'][i] * (1-a) + palette_rgb['c1'][i] * a) for i in range(3))
    elif val < 0.5:
        a = (val - 0.25) * 4
        return tuple(int(palette_rgb['c1'][i] * (1-a) + palette_rgb['c2'][i] * a) for i in range(3))
    elif val < 0.75:
        a = (val - 0.5) * 4
        return tuple(int(palette_rgb['c2'][i] * (1-a) + palette_rgb['c3'][i] * a) for i in range(3))
    elif val < 0.9:
        a = (val - 0.75) * 10
        return tuple(int(palette_rgb['c3'][i] * (1-a) + palette_rgb['peak'][i] * a) for i in range(3))
    else:
        a = (val - 0.9) * 10
        return tuple(int(palette_rgb['peak'][i] * (1-a) + palette_rgb['glow'][i] * a) for i in range(3))

def main():
    print(f"Opening video: {INPUT_VIDEO}")
    cap = cv2.VideoCapture(INPUT_VIDEO)
    if not cap.isOpened():
        print("Error: Could not open video.")
        return

    # Video properties
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    cols = width // CELL_SIZE + 1
    rows = height // CELL_SIZE + 1

    print(f"Original Video: {width}x{height} @ {fps}fps")
    print(f"ASCII Grid: {cols}x{rows} cells (Cell size: {CELL_SIZE}px)")

    # Font setup
    # Make sure Courier is available, otherwise use default
    try:
        # Use a sharper monospace font typically found on Windows
        font = ImageFont.truetype("consola.ttf", CELL_SIZE)
    except IOError:
        font = ImageFont.load_default()

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(OUTPUT_VIDEO, fourcc, fps, (width, height))

    frame_count = 0
    start_time = time.time()

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Convert to processing resolution
        small = cv2.resize(frame, (cols, rows), interpolation=cv2.INTER_AREA)

        # Create blank image for ASCII frame using PIL
        img_pil = Image.new('RGB', (width, height), palette_rgb['bg'])
        draw = ImageDraw.Draw(img_pil)

        for j in range(rows):
            for i in range(cols):
                # OpenCV uses BGR
                b, g, r = small[j, i]
                
                # Extract CCIR 601 Luminance
                luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0

                # Hyper-Contrast Curve (Isolating subject from background)
                val = max(0, luma - 0.2)
                val = min(1.0, val * 1.5)  # Boost multipliers!
                val = pow(val, 2.0)

                # Absolute threshold: if it's too dark, don't draw text (Empty neon void)
                if val < 0.15:
                    continue
                
                # Kinetic Scrolling (Offset by frame_count)
                # Adds a constant flowing stream motion over the frame
                char_idx = (j * cols + i - frame_count * 2) % len(phrase)
                
                # Boost brightness for uppercase vs lowercase variation
                if val > 0.7:
                    char = phrase_upper[char_idx]
                else:
                    char = phrase[char_idx]

                # Fetch color based on luminance
                color = map_color(val)

                # Draw text
                x = i * CELL_SIZE
                y = j * CELL_SIZE
                draw.text((x, y), char, font=font, fill=color)

        # Convert back to OpenCV format
        out_frame = cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGB2BGR)
        
        # Neon Bloom Pass: Simulate cinematic light scattering
        # Gaussian blur composite added onto the original frame
        blur = cv2.GaussianBlur(out_frame, (21, 21), 0)
        out_frame = cv2.addWeighted(out_frame, 1.0, blur, 1.5, 0)

        # Write frame
        out.write(out_frame)

        frame_count += 1
        if frame_count % 30 == 0:
            elapsed = time.time() - start_time
            fps_proc = frame_count / elapsed
            print(f"Processing frame {frame_count}/{total_frames} ({fps_proc:.2f} fps)...")

    cap.release()
    out.release()
    print(f"Done! Saved to {OUTPUT_VIDEO}")

if __name__ == "__main__":
    main()
