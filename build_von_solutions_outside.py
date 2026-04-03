"""
Von Solutions - Outside Brochure Rebuilder
==========================================
Rebuilds the outside trifold brochure so all three panels match
the dark/gold cover aesthetic.

Layout (when folded, viewed from outside):
  LEFT PANEL   = "The Problem" — content from inside panel 01
  MIDDLE PANEL = "Get In Touch" — contact info / back panel
  RIGHT PANEL  = Cover — untouched (replicated exactly)

Requirements:
  pip install reportlab pdf2image pillow pypdf

Optional (for best font matching):
  Download Lora and Poppins from Google Fonts and place .ttf files
  in the same folder as this script, OR install them system-wide.

Usage:
  python build_von_solutions_outside.py
  -> outputs: VON_SOLUTIONS_OUTSIDE_new.pdf
"""

import os
import sys
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor

# ---------------------------------------------------------------------------
# FONT SETUP
# ---------------------------------------------------------------------------
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

def find_font(candidates):
    """Return the first existing font path from a list of candidates."""
    for path in candidates:
        if os.path.exists(path):
            return path
    return None

def sys_font(name):
    return [
        os.path.join(SCRIPT_DIR, name),
        f"/usr/share/fonts/truetype/google-fonts/{name}",
        f"/Library/Fonts/{name}",
        f"C:/Windows/Fonts/{name}",
        os.path.expanduser(f"~/Library/Fonts/{name}"),
    ]

lora_path         = find_font(sys_font("Lora-Variable.ttf") + sys_font("Lora-Regular.ttf") + sys_font("Lora[wght].ttf"))
lora_italic_path  = find_font(sys_font("Lora-Italic-Variable.ttf") + sys_font("Lora-Italic.ttf") + sys_font("Lora-BoldItalic.ttf"))
poppins_path      = find_font(sys_font("Poppins-Regular.ttf"))
poppins_bold_path = find_font(sys_font("Poppins-Bold.ttf"))
poppins_light_path= find_font(sys_font("Poppins-Light.ttf"))

SERIF      = "Times-Roman"
SERIF_BOLD = "Times-Bold"
SANS       = "Helvetica"
SANS_BOLD  = "Helvetica-Bold"
SERIF_ITALIC = "Times-Italic"

if lora_path:
    pdfmetrics.registerFont(TTFont("Lora", lora_path))
    SERIF = "Lora"
    SERIF_BOLD = "Lora"
    print(f"[OK] Loaded Lora from {lora_path}")
else:
    print("[!] Lora not found -- using Times. Download Lora from fonts.google.com for best results.")

if lora_italic_path:
    pdfmetrics.registerFont(TTFont("Lora-Italic", lora_italic_path))
    SERIF_ITALIC = "Lora-Italic"
    print(f"[OK] Loaded Lora-Italic from {lora_italic_path}")

if poppins_path:
    pdfmetrics.registerFont(TTFont("Poppins", poppins_path))
    SANS = "Poppins"
    print(f"[OK] Loaded Poppins from {poppins_path}")

if poppins_bold_path:
    pdfmetrics.registerFont(TTFont("Poppins-Bold", poppins_bold_path))
    SANS_BOLD = "Poppins-Bold"

SANS_LIGHT = SANS
if poppins_light_path:
    pdfmetrics.registerFont(TTFont("Poppins-Light", poppins_light_path))
    SANS_LIGHT = "Poppins-Light"

# ---------------------------------------------------------------------------
# COLORS
# ---------------------------------------------------------------------------
DARK_BG    = HexColor("#1a1712")
GOLD       = HexColor("#c9a84c")
CREAM      = HexColor("#f5f0e8")
MUTED      = HexColor("#b8b0a0")
RULE_COLOR = HexColor("#3a3628")
CIRCLE_CLR = HexColor("#2a2820")

# ---------------------------------------------------------------------------
# PAGE & PANEL DIMENSIONS  (11 x 8.5 landscape)
# ---------------------------------------------------------------------------
W   = 11 * 72
H   = 8.5 * 72
PW  = W / 3
PAD = 28

# ---------------------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------------------

def dark_panel(c, x, y, pw, ph):
    c.setFillColor(DARK_BG)
    c.rect(x, y, pw, ph, fill=1, stroke=0)
    bm = 10
    c.setStrokeColor(GOLD)
    c.setLineWidth(1.2)
    c.rect(x + bm, y + bm, pw - 2*bm, ph - 2*bm, fill=0, stroke=1)

def circles(c, cx, cy, radii):
    c.setStrokeColor(CIRCLE_CLR)
    c.setLineWidth(0.5)
    for r in radii:
        c.circle(cx, cy, r, fill=0, stroke=1)

def section_label(c, x, y, text):
    c.setFillColor(GOLD)
    c.setFont(SANS, 7)
    c.drawString(x, y, text)
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.6)
    c.line(x, y - 8, x + PW - 2*PAD, y - 8)

def gold_rule(c, x, y, length=45):
    c.setStrokeColor(GOLD)
    c.setLineWidth(2)
    c.line(x, y, x + length, y)

def item_divider(c, x, y):
    c.setStrokeColor(RULE_COLOR)
    c.setLineWidth(0.5)
    c.line(x, y, x + PW - 2*PAD, y)

def gold_number_box(c, x, y, n):
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.8)
    c.rect(x, y, 16, 16, fill=0, stroke=1)
    c.setFillColor(GOLD)
    c.setFont(SANS_BOLD, 8)
    c.drawString(x + 4, y + 4, str(n))

def wrap_text(c, text, x, y, max_width, font, size, color, line_height=11):
    c.setFillColor(color)
    c.setFont(font, size)
    words = text.split()
    line = ""
    cur_y = y
    for word in words:
        test = (line + " " + word).strip()
        if c.stringWidth(test, font, size) <= max_width:
            line = test
        else:
            c.drawString(x, cur_y, line)
            cur_y -= line_height
            line = word
    if line:
        c.drawString(x, cur_y, line)
    return cur_y - line_height

# ---------------------------------------------------------------------------
# PANEL 1 — LEFT — "The Problem"
# ---------------------------------------------------------------------------

def draw_problem_panel(c, x, y, pw, ph):
    dark_panel(c, x, y, pw, ph)
    circles(c, x + pw*0.78, y + ph*0.52, [50, 80, 112])

    px = x + PAD

    section_label(c, px, y + ph - 50, "T H E  P R O B L E M")

    c.setFillColor(CREAM)
    c.setFont(SERIF, 26)
    c.drawString(px, y + ph - 96, "Your business")

    c.setFillColor(CREAM)
    c.setFont(SERIF, 26)
    c.drawString(px, y + ph - 128, "is")
    c.setFillColor(GOLD)
    c.setFont(SERIF_ITALIC, 28)
    is_w = c.stringWidth("is ", SERIF, 26)
    c.drawString(px + is_w, y + ph - 130, "bleeding")

    c.setFillColor(CREAM)
    c.setFont(SERIF, 26)
    c.drawString(px, y + ph - 162, "revenue.")

    gold_rule(c, px, y + ph - 174)

    problems = [
        (
            "62% of Calls Go Unanswered",
            "More than half of all calls to small businesses reach no one. "
            "Every single one is a prospect who just called your competitor instead."
        ),
        (
            "You're Responding Too Late",
            "The average business takes 47 hours to follow up on a lead. "
            "Your customer made their decision in 4. The window closes fast."
        ),
        (
            "Manual Work Is Killing You",
            "Hours every week logging calls, chasing leads, updating spreadsheets. "
            "That's paid time producing zero revenue — and it compounds every month."
        ),
    ]

    item_y = y + ph - 208
    for i, (title, body) in enumerate(problems):
        item_divider(c, px, item_y + 18)
        gold_number_box(c, px, item_y, i + 1)

        c.setFillColor(CREAM)
        c.setFont(SERIF, 10.5)
        c.drawString(px + 24, item_y + 6, title)

        bottom = wrap_text(
            c, body,
            px + 24, item_y - 10,
            pw - 2*PAD - 24,
            SANS_LIGHT, 7.5, MUTED, line_height=10.5
        )

        item_y = bottom - 14

    c.setFillColor(GOLD)
    c.setFont(SANS, 7)
    c.drawString(px, y + 20, "V O N  S O L U T I O N S")


# ---------------------------------------------------------------------------
# PANEL 2 — MIDDLE — "Get In Touch"
# ---------------------------------------------------------------------------

def draw_contact_panel(c, x, y, pw, ph):
    dark_panel(c, x, y, pw, ph)
    circles(c, x + pw*0.28, y + ph*0.44, [55, 88, 122])

    px = x + PAD

    section_label(c, px, y + ph - 50, "G E T  I N  T O U C H")

    c.setFillColor(CREAM)
    c.setFont(SERIF, 28)
    c.drawString(px, y + ph - 96, "Let's build")

    c.setFillColor(GOLD)
    c.setFont(SERIF_ITALIC, 30)
    c.drawString(px, y + ph - 132, "something")

    c.setFillColor(CREAM)
    c.setFont(SERIF, 28)
    c.drawString(px, y + ph - 168, "that works.")

    gold_rule(c, px, y + ph - 180)

    contacts = [
        ("P H O N E",         "813-210-0202"),
        ("E M A I L",         "jacobtvt@vonsolutions.com"),
        ("W E B S I T E",     "vonsolutions.com"),
        ("I N S T A G R A M", "@vonsolutions"),
    ]

    contact_y = y + ph - 222
    for label, value in contacts:
        item_divider(c, px, contact_y + 18)

        c.setFillColor(GOLD)
        c.setFont(SANS, 7)
        c.drawString(px, contact_y + 4, label)

        c.setFillColor(CREAM)
        c.setFont(SANS_LIGHT, 9)
        c.drawString(px, contact_y - 10, value)

        contact_y -= 52

    c.setFillColor(HexColor("#6a6458"))
    c.setFont(SANS_LIGHT, 6.5)
    c.drawString(px, y + 20, "© 2025 VON SOLUTIONS · ALL RIGHTS RESERVED")


# ---------------------------------------------------------------------------
# PANEL 3 — RIGHT — Cover
# ---------------------------------------------------------------------------

def draw_cover_panel(c, x, y, pw, ph):
    dark_panel(c, x, y, pw, ph)
    circles(c, x + pw*0.62, y + ph*0.50, [60, 95, 130])

    px = x + PAD

    sq = 10
    gap = 4
    ix = px
    iy = y + ph - 62
    for row in range(2):
        for col in range(2):
            bx = ix + col * (sq + gap)
            by = iy - row * (sq + gap)
            c.setStrokeColor(GOLD)
            c.setLineWidth(1)
            c.rect(bx, by, sq, sq, fill=0, stroke=1)

    c.setFillColor(CREAM)
    c.setFont(SERIF, 30)
    c.drawString(px, y + ph - 105, "V O N")
    c.drawString(px, y + ph - 140, "S O L U T I O N S")

    c.setFillColor(GOLD)
    c.setFont(SANS, 7.5)
    c.drawString(px, y + ph - 157, "A I  A U T O M A T I O N")

    c.setFillColor(CREAM)
    c.setFont(SERIF, 32)
    c.drawString(px, y + ph*0.42, "Your")
    c.drawString(px, y + ph*0.42 - 42, "Business,")

    c.setFillColor(GOLD)
    c.setFont(SERIF_ITALIC, 34)
    c.drawString(px, y + ph*0.42 - 86, "Running")

    c.setFillColor(CREAM)
    c.setFont(SERIF, 32)
    c.drawString(px, y + ph*0.42 - 128, "Itself.")

    c.setStrokeColor(GOLD)
    c.setLineWidth(0.8)
    c.line(px, y + ph*0.42 - 146, x + pw - PAD, y + ph*0.42 - 146)

    c.setFillColor(GOLD)
    c.setFont(SANS, 7.5)
    c.drawString(px, y + 42, "F U L L  A I  S U I T E")


# ---------------------------------------------------------------------------
# BUILD PDF
# ---------------------------------------------------------------------------

output_file = r"C:\Users\corwi\my-agency\VON_SOLUTIONS_OUTSIDE_new.pdf"

c = canvas.Canvas(output_file, pagesize=(W, H))

draw_problem_panel(c, 0,      0, PW, H)
draw_contact_panel(c, PW,     0, PW, H)
draw_cover_panel(  c, PW * 2, 0, PW, H)

c.save()

print(f"\n[DONE] File saved to:\n   {output_file}\n")
print("If fonts look off, download Lora and Poppins from fonts.google.com,")
print("place the .ttf files in the same folder as this script, and re-run.")
