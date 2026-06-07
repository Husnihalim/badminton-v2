#!/usr/bin/env python3
"""
Generate visual mockups for Cross-Club Friendly feature
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
SLATE_800 = "#1e293b"
RED = "#ef4444"
AMBER = "#f59e0b"

# Dimensions
WIDTH = 390  # Mobile width
HEIGHT = 844  # Mobile height

def get_font(size):
    """Try to get a font, fallback to default"""
    try:
        return ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", size)
    except:
        try:
            return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", size)
        except:
            return ImageFont.load_default()

def rounded_rect(draw, xy, radius, fill, outline=None, width=1):
    """Draw a rounded rectangle"""
    x1, y1, x2, y2 = xy
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)

def draw_status_bar(draw):
    """Draw iOS-style status bar"""
    draw.text((30, 12), "9:41", fill=WHITE, font=get_font(14))
    # Battery icon
    draw.rectangle([340, 12, 360, 22], outline=WHITE, width=1)
    draw.rectangle([342, 14, 358, 20], fill=WHITE)

def draw_header(draw, title, show_back=True):
    """Draw app header"""
    y = 50
    if show_back:
        draw.text((20, y), "←", fill=WHITE, font=get_font(24))
    draw.text((WIDTH//2, y), title, fill=WHITE, font=get_font(18), anchor="mm")

def create_friendly_create_modal():
    """Create Friendly Create Modal mockup"""
    img = Image.new('RGB', (WIDTH, HEIGHT), BG_DARK)
    draw = ImageDraw.Draw(img)
    
    # Background overlay
    draw.rectangle([0, 0, WIDTH, HEIGHT], fill="#000000dd")
    
    # Modal
    modal_y = 200
    rounded_rect(draw, [20, modal_y, WIDTH-20, HEIGHT-100], 16, BG_CARD)
    
    # Header
    draw.text((WIDTH//2, modal_y + 30), "Challenge Club to Friendly", 
              fill=WHITE, font=get_font(18), anchor="mm")
    draw.text((WIDTH-40, modal_y + 30), "✕", fill=SLATE_400, font=get_font(18), anchor="mm")
    
    # Search
    y = modal_y + 70
    rounded_rect(draw, [40, y, WIDTH-40, y+40], 8, SLATE_800)
    draw.text((60, y+12), "🔍 Search clubs...", fill=SLATE_500, font=get_font(14))
    
    # Nearby clubs section
    y += 60
    draw.text((40, y), "NEARBY CLUBS", fill=SLATE_500, font=get_font(10))
    
    # Club rows
    clubs = [
        ("🏸", "Smashers PJ", "2.3km • 28 members"),
        ("🏸", "Court Kings", "4.1km • 15 members"),
    ]
    
    for i, (icon, name, meta) in enumerate(clubs):
        y += 35
        rounded_rect(draw, [40, y, WIDTH-40, y+60], 8, "#ffffff08", outline="#ffffff15")
        draw.text((55, y+18), icon, fill=WHITE, font=get_font(20))
        draw.text((90, y+15), name, fill=WHITE, font=get_font(16))
        draw.text((90, y+35), meta, fill=SLATE_400, font=get_font(12))
    
    # OR divider
    y += 80
    draw.line([60, y, WIDTH-60, y], fill="#ffffff20", width=1)
    draw.text((WIDTH//2, y), "OR", fill=SLATE_500, font=get_font(12), anchor="mm")
    
    # New club option
    y += 20
    rounded_rect(draw, [40, y, WIDTH-40, y+70], 8, "#ffffff08", outline="#ffffff20", width=2)
    draw.text((60, y+20), "💬", fill=LIME, font=get_font(24))
    draw.text((100, y+18), "Club not on KelabSukan?", fill=WHITE, font=get_font(14))
    draw.text((100, y+38), "Invite them to join and play", fill=SLATE_400, font=get_font(12))
    
    return img

def create_invite_landing():
    """Create Invite Landing Page mockup"""
    img = Image.new('RGB', (WIDTH, HEIGHT), BG_DARK)
    draw = ImageDraw.Draw(img)
    
    # Logo
    draw.text((WIDTH//2, 80), "KelabSukan", fill=LIME, font=get_font(24), anchor="mm")
    
    # Inviting club card
    y = 140
    rounded_rect(draw, [30, y, WIDTH-30, y+80], 12, BG_CARD)
    draw.text((60, y+20), "🏸", fill=WHITE, font=get_font(32))
    draw.text((110, y+25), "LEP BC", fill=WHITE, font=get_font(20))
    draw.text((110, y+50), "📍 Kuala Lumpur", fill=SLATE_400, font=get_font(12))
    
    # Challenge text
    y += 110
    draw.text((WIDTH//2, y), "wants to play you!", fill=WHITE, font=get_font(20), anchor="mm")
    
    # Challenge card
    y += 40
    rounded_rect(draw, [30, y, WIDTH-30, y+180], 12, BG_CARD, outline=f"{LIME}40", width=2)
    
    # Badge
    badge_w = 140
    rounded_rect(draw, [40, y+15, 40+badge_w, y+35], 4, LIME)
    draw.text((40+badge_w//2, y+25), "Friendly Challenge", fill=BG_DARK, font=get_font(10), anchor="mm")
    
    # Title
    draw.text((40, y+55), "Friday Night Friendly", fill=WHITE, font=get_font(22))
    
    # Details
    draw.text((40, y+90), "👥 5 pairs • 1 set per match", fill=SLATE_300, font=get_font(14))
    draw.text((40, y+115), "🏆 21 points, win by 2", fill=SLATE_300, font=get_font(14))
    draw.text((40, y+145), "Most pair wins takes the friendly.", fill=SLATE_400, font=get_font(12))
    
    # CTA Button
    y += 210
    rounded_rect(draw, [30, y, WIDTH-30, y+56], 8, LIME)
    draw.text((WIDTH//2, y+28), "Accept Challenge →", fill=BG_DARK, font=get_font(18), anchor="mm")
    
    # Subtext
    y += 70
    draw.text((WIDTH//2, y), "Create your club to accept (takes 2 min)", 
              fill=SLATE_400, font=get_font(12), anchor="mm")
    
    # OR divider
    y += 30
    draw.line([60, y, WIDTH-60, y], fill="#ffffff20", width=1)
    draw.text((WIDTH//2, y), "OR", fill=SLATE_500, font=get_font(12), anchor="mm")
    
    # Login link
    y += 20
    rounded_rect(draw, [30, y, WIDTH-30, y+48], 8, "#ffffff10", outline="#ffffff20")
    draw.text((WIDTH//2, y+24), "Already on KelabSukan? Log in", 
              fill=WHITE, font=get_font(14), anchor="mm")
    
    return img

def create_live_scoreboard():
    """Create Live Scoreboard mockup"""
    img = Image.new('RGB', (WIDTH, HEIGHT), BG_DARK)
    draw = ImageDraw.Draw(img)
    
    draw_status_bar(draw)
    draw_header(draw, "Friday Night Friendly")
    
    y = 100
    
    # Live badge
    rounded_rect(draw, [20, y, 70, y+24], 4, LIME)
    draw.text((45, y+12), "● LIVE", fill=BG_DARK, font=get_font(10), anchor="mm")
    
    # Scoreboard card
    y += 40
    rounded_rect(draw, [20, y, WIDTH-20, y+160], 12, BG_CARD, outline=f"{LIME}30")
    
    # Scores
    draw.text((WIDTH//2 - 60, y+50), "LEP BC", fill=SLATE_400, font=get_font(14), anchor="mm")
    draw.text((WIDTH//2 + 60, y+50), "Smashers PJ", fill=SLATE_400, font=get_font(14), anchor="mm")
    
    draw.text((WIDTH//2 - 60, y+100), "3", fill=LIME, font=get_font(56))
    draw.text((WIDTH//2, y+100), "-", fill=SLATE_500, font=get_font(40))
    draw.text((WIDTH//2 + 40, y+100), "2", fill=WHITE, font=get_font(56))
    
    draw.text((WIDTH//2, y+140), "2 matches remain", fill=SLATE_400, font=get_font(12), anchor="mm")
    
    # Matches section
    y += 190
    draw.text((20, y), "MATCHES", fill=SLATE_500, font=get_font(10))
    
    matches = [
        ("✓", "Amir/Husni", "21-18", "Faiz/Danial", "LEP BC wins", True),
        ("✓", "Ali/Ahmad", "19-21", "Raj/Kumar", "Smashers PJ wins", False),
        ("✓", "Newbies", "21-15", "Veterans", "LEP BC wins", True),
        ("○", "A Team", "18-18", "B Team", "[Record Result]", None),
        ("○", "Rookies", "vs", "Pros", "[Waiting...]", None),
    ]
    
    for icon, team1, score, team2, status, won in matches:
        y += 50
        card_h = 90 if icon == "○" else 70
        rounded_rect(draw, [20, y, WIDTH-20, y+card_h], 8, BG_CARD if icon == "✓" else "#ffffff08")
        
        # Status
        if icon == "✓":
            draw.text((30, y+15), "✓", fill=LIME, font=get_font(14))
        elif icon == "○" and score == "18-18":
            rounded_rect(draw, [30, y+12, 80, y+28], 4, LIME)
            draw.text((55, y+20), "● LIVE", fill=BG_DARK, font=get_font(9), anchor="mm")
        
        # Teams and score
        draw.text((30, y+35), team1, fill=WHITE, font=get_font(14))
        draw.text((WIDTH//2, y+35), score, fill=WHITE if icon == "✓" else SLATE_400, font=get_font(16), anchor="mm")
        draw.text((WIDTH-30, y+35), team2, fill=WHITE, font=get_font(14), anchor="ra")
        
        # Status line
        if icon == "✓":
            color = LIME if won else SLATE_400
            draw.text((30, y+55), status, fill=color, font=get_font(11))
        elif icon == "○" and score == "18-18":
            rounded_rect(draw, [30, y+55, WIDTH-30, y+80], 6, LIME)
            draw.text((WIDTH//2, y+67), "Record Result", fill=BG_DARK, font=get_font(14), anchor="mm")
        else:
            draw.text((30, y+55), status, fill=SLATE_500, font=get_font(11))
    
    return img

def create_matchmaking_grid():
    """Create Matchmaking Grid mockup"""
    img = Image.new('RGB', (WIDTH, HEIGHT), BG_DARK)
    draw = ImageDraw.Draw(img)
    
    draw_status_bar(draw)
    draw_header(draw, "Matchmaking")
    
    y = 100
    
    # Status
    rounded_rect(draw, [20, y, 140, y+28], 4, LIME)
    draw.text((90, y+14), "🔓 Matchmaking", fill=BG_DARK, font=get_font(11), anchor="mm")
    draw.text((WIDTH-20, y+14), "3 of 5 set", fill=SLATE_400, font=get_font(12), anchor="ra")
    
    # Grid rows
    pairs_a = ["Amir/Husni", "Ali/Ahmad", "Newbies", "A Team", "Rookies"]
    pairs_b = ["Faiz/Danial", "Raj/Kumar", "Veterans", "B Team", "Pros"]
    matchups = [0, 1, 2, None, None]  # Which B is matched
    
    y += 50
    for i, (pair_a, matchup) in enumerate(zip(pairs_a, matchups)):
        row_h = 70
        is_selected = i == 3  # 4th row selected
        
        border_color = f"{LIME}60" if is_selected else "#ffffff15"
        bg_color = f"{LIME}10" if is_selected else "#ffffff08"
        
        rounded_rect(draw, [20, y, WIDTH-20, y+row_h], 8, bg_color, outline=border_color)
        
        # Number
        draw.text((35, y+row_h//2), str(i+1), fill=SLATE_500, font=get_font(14), anchor="lm")
        
        # Pair A
        draw.text((55, y+20), pair_a, fill=WHITE, font=get_font(14))
        draw.text((55, y+40), "LEP BC", fill=SLATE_400, font=get_font(11))
        
        # VS
        draw.text((WIDTH//2, y+row_h//2), "vs", fill=SLATE_500, font=get_font(12), anchor="mm")
        
        # Pair B (if set)
        if matchup is not None:
            pair_b = pairs_b[matchup]
            draw.text((WIDTH-30, y+20), pair_b, fill=WHITE, font=get_font(14), anchor="ra")
            draw.text((WIDTH-30, y+40), "Smashers PJ", fill=SLATE_400, font=get_font(11), anchor="ra")
            draw.text((WIDTH-50, y+row_h//2), "✕", fill=SLATE_500, font=get_font(12), anchor="mm")
        else:
            hint = "Select opponent..." if is_selected else "Click to set"
            draw.text((WIDTH-30, y+row_h//2), hint, fill=SLATE_500, font=get_font(12), anchor="rm")
        
        y += row_h + 8
    
    # Selection panel (for selected row)
    y += 10
    rounded_rect(draw, [20, y, WIDTH-20, y+140], 8, BG_CARD, outline=f"{LIME}40")
    draw.text((30, y+15), "Select opponent for A Team", fill=SLATE_300, font=get_font(12))
    
    # Options
    options = ["Faiz/Danial ✓", "Raj/Kumar ✓", "Veterans ✓", "B Team", "Pros"]
    opt_y = y + 45
    for j, opt in enumerate(options):
        x = 30 + (j % 2) * 170
        y_pos = opt_y + (j // 2) * 45
        
        is_taken = "✓" in opt
        opt_clean = opt.replace(" ✓", "")
        
        bg = "#ffffff08" if not is_taken else "#ffffff05"
        border = LIME if not is_taken else "#ffffff10"
        text_color = WHITE if not is_taken else SLATE_500
        
        rounded_rect(draw, [x, y_pos, x+160, y_pos+35], 6, bg, outline=border)
        draw.text((x+10, y_pos+17), opt_clean, fill=text_color, font=get_font(12), anchor="lm")
    
    # Lock button
    y += 160
    rounded_rect(draw, [20, y, WIDTH-20, y+50], 8, LIME)
    draw.text((WIDTH//2, y+25), "🔒 Lock Matchmaking", fill=BG_DARK, font=get_font(16), anchor="mm")
    
    return img

def main():
    """Generate all mockups"""
    output_dir = os.path.dirname(os.path.abspath(__file__))
    
    mockups = [
        ("01_create_modal", create_friendly_create_modal),
        ("02_invite_landing", create_invite_landing),
        ("03_live_scoreboard", create_live_scoreboard),
        ("04_matchmaking_grid", create_matchmaking_grid),
    ]
    
    for filename, generator in mockups:
        img = generator()
        filepath = os.path.join(output_dir, f"{filename}.png")
        img.save(filepath, "PNG")
        print(f"Generated: {filepath}")
    
    print("\nAll mockups generated successfully!")

if __name__ == "__main__":
    main()
