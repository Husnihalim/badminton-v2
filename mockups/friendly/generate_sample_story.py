#!/usr/bin/env python3
"""
Generate a sample story visual mockup with full narrative
"""

from PIL import Image, ImageDraw, ImageFont

# Colors
BG_DARK = "#040d0f"
BG_CARD = "#0a0f0e"
LIME = "#ccff00"
AMBER = "#f59e0b"
WHITE = "#ffffff"
SLATE_300 = "#cbd5e1"
SLATE_400 = "#94a3b8"
SLATE_500 = "#64748b"

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

def create_sample_story_mockup():
    """Sample Story: The Upset That Changed Everything"""
    img = Image.new('RGB', (WIDTH, HEIGHT), BG_DARK)
    draw = ImageDraw.Draw(img)
    
    y = 60
    
    # Header - THE STORY
    draw.text((20, y), "THE STORY", fill=SLATE_500, font=get_font(12))
    
    # Main Story Card
    y += 30
    card_height = 380
    rounded_rect(draw, [20, y, WIDTH-20, y+card_height], 16, BG_CARD, outline=f"{AMBER}30", width=2)
    
    # Upset Badge
    badge_w = 100
    rounded_rect(draw, [35, y+20, 35+badge_w, y+48], 6, AMBER)
    draw.text((35+badge_w//2, y+34), "🔥 UPSET", fill=BG_DARK, font=get_font(12), anchor="mm")
    
    # Story Title
    y += 75
    draw.text((35, y), "Upset Alert", fill=WHITE, font=get_font(28))
    
    # Story Body - Full narrative
    y += 45
    story_text = """The scoreboard just got interesting. Newbies weren't supposed to win this. Everyone had penciled in Veterans for the easy point.

But Newbies didn't read the script.

They played like they had nothing to lose—because they didn't. And Veterans played like they just had to show up—because they did.

One set later, the friendly looks very different."""
    
    # Wrap text manually
    words = story_text.split()
    lines = []
    current_line = []
    
    for word in words:
        test_line = ' '.join(current_line + [word])
        bbox = draw.textbbox((0, 0), test_line, font=get_font(14))
        if bbox[2] - bbox[0] <= WIDTH - 70:
            current_line.append(word)
        else:
            lines.append(' '.join(current_line))
            current_line = [word]
    if current_line:
        lines.append(' '.join(current_line))
    
    for line in lines:
        draw.text((35, y), line, fill=SLATE_300, font=get_font(14))
        y += 22
    
    # Proof
    y += 15
    draw.text((35, y), "Match 3 • 21-15 • Newbies vs Veterans", fill=SLATE_500, font=get_font(11))
    
    # Share Button
    y += 40
    rounded_rect(draw, [35, y, 200, y+40], 8, "#ffffff10", outline="#ffffff20")
    draw.text((115, y+20), "↗ Share this moment", fill=WHITE, font=get_font(13), anchor="mm")
    
    # Context Card - The Friendly
    y += 80
    rounded_rect(draw, [20, y, WIDTH-20, y+120], 12, BG_CARD)
    
    draw.text((35, y+15), "THE FRIENDLY", fill=SLATE_500, font=get_font(10))
    
    # Score
    y += 45
    draw.text((35, y), "LEP BC", fill=WHITE, font=get_font(18))
    draw.text((WIDTH//2, y), "2 - 2", fill=WHITE, font=get_font(24), anchor="mm")
    draw.text((WIDTH-35, y), "Smashers PJ", fill=WHITE, font=get_font(18), anchor="ra")
    
    # Status
    y += 35
    rounded_rect(draw, [35, y, 80, y+24], 4, LIME)
    draw.text((75, y+12), "● LIVE", fill=BG_DARK, font=get_font(10), anchor="mm")
    
    draw.text((120, y+12), "1 match remains", fill=SLATE_400, font=get_font(12))
    
    # WhatsApp Preview
    y += 70
    draw.text((20, y), "WHATSAPP PREVIEW", fill=SLATE_500, font=get_font(10))
    
    y += 30
    # WhatsApp bubble
    rounded_rect(draw, [20, y, WIDTH-20, y+140], 12, "#075e54")
    
    whatsapp_text = """LEP BC 2-2 Smashers PJ — LIVE!

Upset Alert: Newbies beat Veterans 21-15

"The scoreboard just got interesting. Newbies weren't supposed to win this..."

Follow live: kelabsukan.com/f/abc123"""
    
    y += 20
    for line in whatsapp_text.split('\n'):
        if line.startswith('LEP'):
            draw.text((35, y), line, fill=WHITE, font=get_font(14))
        elif line.startswith('Upset'):
            draw.text((35, y), line, fill=LIME, font=get_font(13))
        elif line.startswith('"'):
            draw.text((35, y), line, fill=SLATE_300, font=get_font(12))
        elif line.startswith('Follow'):
            draw.text((35, y), line, fill="#67d4ff", font=get_font(12))
        else:
            draw.text((35, y), line, fill=SLATE_400, font=get_font(11))
        y += 20
    
    return img

def create_story_collection():
    """Show multiple stories in a collection"""
    img = Image.new('RGB', (WIDTH, HEIGHT), BG_DARK)
    draw = ImageDraw.Draw(img)
    
    y = 60
    
    draw.text((20, y), "THE STORY (4)", fill=SLATE_500, font=get_font(12))
    
    stories = [
        {
            "badge": "🔥 UPSET",
            "badge_color": AMBER,
            "title": "Upset Alert",
            "body": "The scoreboard just got interesting. Newbies weren't supposed to win this.",
            "proof": "Match 3"
        },
        {
            "badge": "⚡ COMEBACK",
            "badge_color": LIME,
            "title": "The Comeback Is Real",
            "body": "LEP BC was down 2-0. Now it's tied. Momentum is a funny thing.",
            "proof": "Match 4"
        },
        {
            "badge": "🏆 COMPLETE",
            "badge_color": "#38bdf8",
            "title": "Friendly Complete",
            "body": "LEP BC takes the friendly. The dinner conversation just got one-sided.",
            "proof": "Final Result"
        }
    ]
    
    for story in stories:
        y += 25
        card_h = 160
        rounded_rect(draw, [20, y, WIDTH-20, y+card_h], 12, BG_CARD)
        
        # Badge
        badge_w = 110
        rounded_rect(draw, [35, y+15, 35+badge_w, y+40], 4, story["badge_color"])
        draw.text((35+badge_w//2, y+27), story["badge"], fill=BG_DARK, font=get_font(10), anchor="mm")
        
        # Title
        draw.text((35, y+55), story["title"], fill=WHITE, font=get_font(20))
        
        # Body
        draw.text((35, y+85), story["body"], fill=SLATE_300, font=get_font(13))
        
        # Proof
        draw.text((35, y+115), story["proof"], fill=SLATE_500, font=get_font(11))
        
        # Share button
        rounded_rect(draw, [35, y+130, 150, y+155], 6, "#ffffff10")
        draw.text((90, y+142), "↗ Share", fill=WHITE, font=get_font(11), anchor="mm")
        
        y += card_h
    
    return img

if __name__ == "__main__":
    import os
    output_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Generate sample story
    img1 = create_sample_story_mockup()
    img1.save(os.path.join(output_dir, "11_sample_story_full.png"), "PNG")
    print("Generated: 11_sample_story_full.png")
    
    # Generate story collection
    img2 = create_story_collection()
    img2.save(os.path.join(output_dir, "12_story_collection.png"), "PNG")
    print("Generated: 12_story_collection.png")
    
    print("\nSample story mockups complete!")
