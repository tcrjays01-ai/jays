import cv2
import mediapipe as mp
import numpy as np
import math
from PIL import Image, ImageDraw, ImageFont

# ---------------------------------------------------------
# Phase 3 Configuration
# ---------------------------------------------------------
phrase = "WEARENOTRAY"
phrase_upper = "WEARENOTRAY"

palette_rgb = {
    'bg': (0, 0, 0),
    'c1': (3, 3, 15),
    'c2': (6, 10, 40),
    'c3': (20, 30, 110),
    'peak': (30, 100, 255),
    'glow': (150, 220, 255)
}

# ---------------------------------------------------------
# Color Mapping Logic
# ---------------------------------------------------------
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

# ---------------------------------------------------------
# Main Execution
# ---------------------------------------------------------
def main():
    # Initialize MediaPipe Hands
    mp_hands = mp.solutions.hands
    hands = mp_hands.Hands(max_num_hands=1, min_detection_confidence=0.7)
    
    # Initialize Webcam
    cap = cv2.VideoCapture(0)
    
    # Default cell size and target cell size (smoothing)
    current_cell_size = 12
    target_cell_size = 12

    try:
        font_cache = {}
        # Pre-cache a few common sizes if needed or just load on the fly
        def get_font(size):
            size = max(4, size) # Minimum font size constraint
            if size not in font_cache:
                try:
                    font_cache[size] = ImageFont.truetype("consola.ttf", size)
                except IOError:
                    font_cache[size] = ImageFont.load_default()
            return font_cache[size]

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            # Flip frame horizontally for a more natural mirror view
            frame = cv2.flip(frame, 1)
            h, w, c = frame.shape
            
            # --- MediaPipe Tracking ---
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = hands.process(rgb_frame)
            
            # Determine Finger Distance mapped to Cell Size
            if results.multi_hand_landmarks:
                hand_landmarks = results.multi_hand_landmarks[0]
                
                thumb_tip = hand_landmarks.landmark[mp_hands.HandLandmark.THUMB_TIP]
                index_tip = hand_landmarks.landmark[mp_hands.HandLandmark.INDEX_FINGER_TIP]
                
                x1, y1 = int(thumb_tip.x * w), int(thumb_tip.y * h)
                x2, y2 = int(index_tip.x * w), int(index_tip.y * h)
                
                dist = math.hypot(x2 - x1, y2 - y1)
                
                # Map distance (approx 20px to 300px) to CELL_SIZE (e.g., 4 to 32)
                # Pinch = dense grid (4). Spread = large characters (32)
                mapped_size = int(np.interp(dist, [20, 250], [4, 32]))
                target_cell_size = mapped_size
            
            # Smooth the cell size transition
            current_cell_size = int(0.8 * current_cell_size + 0.2 * target_cell_size)
            cell_size = max(4, current_cell_size)

            # --- ASCII Rendering ---
            cols = w // cell_size + 1
            rows = h // cell_size + 1
            
            # Resize internal frame to grid dimensions to extract pixel luma rapidly
            small = cv2.resize(frame, (cols, rows), interpolation=cv2.INTER_AREA)

            # Create the blank RGB PIL Image wrapper
            img_pil = Image.new('RGB', (w, h), palette_rgb['bg'])
            draw = ImageDraw.Draw(img_pil)
            font = get_font(cell_size)

            # Paint ASCII text into image based on Luma mapping
            for j in range(rows):
                for i in range(cols):
                    b_val, g_val, r_val = small[j, i]
                    
                    # CCIR 601 Luminance
                    luma = (0.299 * r_val + 0.587 * g_val + 0.114 * b_val) / 255.0
                    val = max(0, luma - 0.1)
                    val = min(1.0, val)
                    val = pow(val, 1.4)

                    if val < 0.02:
                        continue
                    
                    char_idx = (j * cols + i) % len(phrase)
                    if val > 0.8:
                        char = phrase_upper[char_idx]
                    else:
                        char = phrase[char_idx]

                    color = map_color(val)
                    x = i * cell_size
                    y = j * cell_size
                    
                    draw.text((x, y), char, font=font, fill=color)

            # Display Output with OpenCV
            out_frame = cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGB2BGR)
            
            # Overlay simple text for UI
            cv2.putText(out_frame, f"Pinch Distance >> Grid Size: {cell_size}", (20, 40),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            
            cv2.imshow("COSMIC - Realtime ASCII Generator (Phase 3)", out_frame)

            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
                
    finally:
        cap.release()
        cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
