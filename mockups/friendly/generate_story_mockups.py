#!/usr/bin/env python3
"""
Generate visual mockups for Friendly Stories and Share Cards
"""

from PIL import Image, ImageDraw, ImageFont
import os

# Colors
BG_DARK = "#040d0f"
BG_CARD = "#0a0f0e"
LIME = "#ccff00"
BLUE = "#38bdf8"
WHITE = "#ffffff"
SLATE_300 = "#cbd5e1"
SLATE_400 = "#94a3b8"
SLATE_500 = "#64748b"
SLATE_600 = "#475569"
AMBER = "#f59e0b"
RED = "#ef4444"

# Dimensions
WIDTH = 390
HEIGHT = 844

def get_font(size):
    try:
        return ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", size)
    except:
        try:
            return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", size)
        except:
            return ImageFont.load_default()

def rounded_rect(draw, xy, radius, fill, outline=None, width=1):
    x1, y1, x2, y2 = xy
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)

def create_story_card_upset():
    """Upset Alert Story Card"""
    img = Image.new('RGB', (WIDTH, HEIGHT), BG_DARK)
    draw = ImageDraw.Draw(img)
    
    y = 100
    
    # Header
    draw.text((20, y), "THE STORY (5)", fill=SLATE_500, font=get_font(10))
    
    # Story Card
    y += 30
    rounded_rect(draw, [20, y, WIDTH-20, y+180], 12, BG_CARD)
    
    # Badge
    rounded_rect(draw, [30, y+15, 110, y+35], 4, AMBER)
    draw.text((70, y+25), "🔥 Upset", fill=BG_DARK, font=get_font(10), anchor="mm")
    
    # Title
    draw.text((30, y+55), "Upset Alert", fill=WHITE, font=get_font(22))
    
    # Body
    body_text = "The scoreboard just got interesting. Newbies weren't supposed to win this."
    draw.text((30, y+90), body_text, fill=SLATE_300, font=get_font(14))
    
    # Share button
    rounded_rect(draw, [30, y+135, 160, y+165], 6, "#ffffff10", outline="#ffffff20")
    draw.text((90, y+150), "↗ Share this moment", fill=WHITE, font=get_font(12), anchor="mm")
    
    return img

def create_story_card_comeback():
    """Comeback Story Card"""
    img = Image.new('RGB', (WIDTH, HEIGHT), BG_DARK)
    draw = ImageDraw.Draw(img)
    
    y = 100
    
    draw.text((20, y), "THE STORY", fill=SLATE_500, font=get_font(10))
    
    y += 30
    rounded_rect(draw, [20, y, WIDTH-20, y+200], 12, BG_CARD)
    
    # Badge
    rounded_rect(draw, [30, y+15, 130, y+35], 4, LIME)
    draw.text((95, y+25), "⚡ Comeback", fill=BG_DARK, font=get_font(10), anchor="mm")
    
    # Title
    draw.text((30, y+55), "The Comeback Is Real", fill=WHITE, font=get_font(22))
    
    # Body
    body_text = "LEP BC was down 2-0. Now it's tied. Momentum is a funny thing."
    draw.text((30, y+90), body_text, fill=SLATE_300, font=get_font(14))
    
    # Proof
    draw.text((30, y+125), "Match 4", fill=SLATE_500, font=get_font(11))
    
    # Share button
    rounded_rect(draw, [30, y+155, 160, y+185], 6, "#ffffff10", outline="#ffffff20")
    draw.text((90, y+170), "↗ Share this moment", fill=WHITE, font=get_font(12), anchor="mm")
    
    return img

def create_story_card_completed():
    """Friendly Completed Story Card"""
    img = Image.new('RGB', (WIDTH, HEIGHT), BG_DARK)
    draw = ImageDraw.Draw(img)
    
    y = 100
    
    draw.text((20, y), "THE STORY", fill=SLATE_500, font=get_font(10))
    
    y += 30
    rounded_rect(draw, [20, y, WIDTH-20, y+180], 12, BG_CARD)
    
    # Badge
    rounded_rect(draw, [30, y+15, 100, y+35], 4, BLUE)
    draw.text((80, y+25), "🏆 Complete", fill=BG_DARK, font=get_font(10), anchor="mm")
    
    # Title
    draw.text((30, y+55), "Friendly Complete", fill=WHITE, font=get_font(22))
    
    # Body
    body_text = "LEP BC takes the friendly. The dinner conversation just got one-sided."
    draw.text((30, y+90), body_text, fill=SLATE_300, font=get_font(14))
    
    # Share button
    rounded_rect(draw, [30, y+135, 160, y+165], 6, "#ffffff10", outline="#ffffff20")
    draw.text((90, y+150), "↗ Share this moment", fill=WHITE, font=get_font(12), anchor="mm")
    
    return img

def create_share_card_square():
    """Square Share Card (1080x1080)"""
    img = Image.new('RGB', (1080, 1080), BG_DARK)
    draw = ImageDraw.Draw(img)
    
    # Border
    draw.rectangle([20, 20, 1060, 1060], outline=f"{LIME}40", width=8)
    
    # LIVE Badge
    rounded_rect(draw, [60, 60, 200, 100], 8, LIME)
    draw.text((130, 80), "● LIVE", fill=BG_DARK, font=get_font(24))
    
    # Score
    draw.text((540, 250), "LEP BC", fill=SLATE_400, font=get_font(36), anchor="mm")
    draw.text((540, 350), "3", fill=LIME, font=get_font(120), anchor="mm")
    draw.text((540, 450), "-", fill=SLATE_500, font=get_font(60), anchor="mm")
    draw.text((540, 550), "2", fill=WHITE, font=get_font(120), anchor="mm")
    draw.text((540, 650), "Smashers PJ", fill=SLATE_400, font=get_font(36), anchor="mm")
    
    # Status
    draw.text((540, 750), "2 matches remain", fill=SLATE_400, font=get_font(28), anchor="mm")
    
    # Quote
    draw.text((540, 850), '"This is getting tense."', fill=SLATE_300, font=get_font(28), anchor="mm")
    
    # Footer
    draw.text((540, 980), "KelabSukan", fill=LIME, font=get_font(32), anchor="mm")
    draw.text((540, 1020), "kelabsukan.com/f/abc123", fill=SLATE_500, font=get_font(20), anchor="mm")
    
    return img

def create_share_card_result():
    """Result Share Card"""
    img = Image.new('RGB', (1080, 1080), BG_DARK)
    draw = ImageDraw.Draw(img)
    
    # Border
    draw.rectangle([20, 20, 1060, 1060], outline=f"{LIME}40", width=8)
    
    # Badge
    rounded_rect(draw, [60, 60, 280, 100], 8, LIME)
    draw.text((170, 80), "FRIENDLY RESULT", fill=BG_DARK, font=get_font(24))
    
    # Trophy and Score
    draw.text((540, 200), "🏆", fill=WHITE, font=get_font(60), anchor="mm")
    
    draw.text((540, 320), "LEP BC", fill=WHITE, font=get_font(48), anchor="mm")
    draw.text((540, 400), "3", fill=LIME, font=get_font(100), anchor="mm")
    draw.text((540, 520), "2", fill=SLATE_400, font=get_font(100), anchor="mm")
    draw.text((540, 600), "Smashers PJ", fill=SLATE_400, font=get_font(48), anchor="mm")
    
    # Quote
    draw.text((540, 720), '"The upset that decided it"', fill=SLATE_300, font=get_font(28), anchor="mm")
    
    # Winner
    draw.text((540, 800), "Bragging rights: LEP BC", fill=LIME, font=get_font(28), anchor="mm")
    
    # Footer
    draw.text((540, 980), "KelabSukan", fill=LIME, font=get_font(32), anchor="mm")
    
    return img

def create_share_card_vertical():
    """Vertical Story Share (1080x1920)"""
    img = Image.new('RGB', (1080, 1920), BG_DARK)
    draw = ImageDraw.Draw(img)
    
    # Border
    draw.rectangle([20, 20, 1060, 1900], outline=f"{LIME}40", width=8)
    
    # Header
    rounded_rect(draw, [60, 60, 240, 110], 8, LIME)
    draw.text((150, 85), "● LIVE", fill=BG_DARK, font=get_font(28))
    
    # Title
    draw.text((540, 200), "Friday Night Friendly", fill=WHITE, font=get_font(48), anchor="mm")
    
    # Score
    draw.text((540, 350), "LEP BC 3 - 2 Smashers PJ", fill=WHITE, font=get_font(56), anchor="mm")
    
    # Match list
    y = 500
    matches = [
        ("Amir/Husni", "21-18", "Faiz/Danial"),
        ("Ali/Ahmad", "19-21", "Raj/Kumar"),
        ("Newbies", "21-15", "Veterans"),
    ]
    
    for team1, score, team2 in matches:
        draw.text((100, y), f"✓ {team1}", fill=WHITE, font=get_font(32))
        draw.text((540, y), score, fill=LIME, font=get_font(32), anchor="mm")
        draw.text((980, y), team2, fill=WHITE, font=get_font(32), anchor="ra")
        y += 80
    
    # Live match
    draw.rectangle([80, y, 1000, y+120], fill=LIME)
    draw.text((540, y+30), "● LIVE: A Team 18-18 B Team", fill=BG_DARK, font=get_font(32), anchor="mm")
    draw.text((540, y+80), "[Record Result]", fill=BG_DARK, font=get_font(24), anchor="mm")
    
    # Story quote
    y += 180
    draw.text((540, y), '"The upset nobody saw coming"', fill=SLATE_300, font=get_font(32), anchor="mm")
    draw.text((540, y+50), "Newbies beat Veterans to clinch it", fill=SLATE_400, font=get_font(24), anchor="mm")
    
    # CTA
    y += 150
    rounded_rect(draw, [200, y, 880, y+80], 12, LIME)
    draw.text((540, y+40), "Follow Live →", fill=BG_DARK, font=get_font(32), anchor="mm")
    
    # Footer
    draw.text((540, 1800), "KelabSukan", fill=LIME, font=get_font(40), anchor="mm")
    draw.text((540, 1850), "kelabsukan.com/f/abc123", fill=SLATE_500, font=get_font(24), anchor="mm")
    
    return img

def main():
    output_dir = os.path.dirname(os.path.abspath(__file__))
    
    mockups = [
        ("05_story_upset", create_story_card_upset),
        ("06_story_comeback", create_story_card_comeback),
        ("07_story_completed", create_story_card_completed),
        ("08_share_square", create_share_card_square),
        ("09_share_result", create_share_card_result),
        ("10_share_vertical", create_share_card_vertical),
    ]
    
    for filename, generator in mockups:
        try:
            img = generator()
            filepath = os.path.join(output_dir, f"{filename}.png")
            img.save(filepath, "PNG")
            print(f"Generated: {filepath}")
        except Exception as e:
            print(f"Error generating {filename}: {e}")
    
    print("\nAll story and share mockups generated!")

if __name__ == "__main__":
    main()
