#!/usr/bin/env python3
"""Generate DR-monogram icon palette variants (same mark, different colors)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "store" / "icon-variants" / "variant-a-palettes"
SIZES = (16, 32, 48, 128)

# Same geometry as Variant A; only colors change. Avoid original teal #0b6e6a.
PALETTES = [
    {
        "id": "a1-ink",
        "name": "Ink",
        "bg": (28, 36, 48, 255),
        "fg": (244, 246, 248, 255),
        "pitch": "Near-black slate plate, cool white DR — neutral, high contrast.",
    },
    {
        "id": "a2-navy",
        "name": "Navy",
        "bg": (30, 58, 95, 255),
        "fg": (255, 255, 255, 255),
        "pitch": "Deep navy + white — classic toolbar/store look.",
    },
    {
        "id": "a3-graphite-amber",
        "name": "Graphite Amber",
        "bg": (26, 26, 26, 255),
        "fg": (242, 177, 52, 255),
        "pitch": "Black plate, amber DR — score/heat energy without teal.",
    },
    {
        "id": "a4-stone",
        "name": "Stone",
        "bg": (232, 228, 220, 255),
        "fg": (26, 26, 26, 255),
        "pitch": "Light stone plate, charcoal DR — reads on dark Chrome toolbars.",
    },
]


def rounded_rect_mask(size: int, radius: float) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return mask


def load_font(px: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Supplemental/Helvetica.ttc",
        "/Library/Fonts/Arial Bold.ttf",
        "/System/Library/Fonts/SFNS.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, px)
        except OSError:
            continue
    return ImageFont.load_default()


def draw_monogram(canvas: int, bg: tuple, fg: tuple, pad_ratio: float = 0.125) -> Image.Image:
    """Draw DR on squircle. pad_ratio ≈ Chrome 128 store padding (~16/128)."""
    img = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    pad = int(round(canvas * pad_ratio))
    inner = canvas - 2 * pad
    if inner < 8:
        pad = max(0, (canvas - 8) // 2)
        inner = canvas - 2 * pad

    plate = Image.new("RGBA", (inner, inner), bg)
    radius = inner * 0.22
    plate.putalpha(rounded_rect_mask(inner, radius))
    img.paste(plate, (pad, pad), plate)

    # Font size relative to plate; bold DR should dominate.
    font_size = max(8, int(inner * 0.48))
    font = load_font(font_size)
    draw = ImageDraw.Draw(img)
    text = "DR"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (canvas - tw) / 2 - bbox[0]
    # Optical vertical center (letters sit slightly high otherwise).
    y = (canvas - th) / 2 - bbox[1] - inner * 0.02
    draw.text((x, y), text, font=font, fill=fg)
    return img


def export_sizes(master: Image.Image, dest: Path) -> None:
    dest.mkdir(parents=True, exist_ok=True)
    master.save(dest / "master-1024.png")
    for size in SIZES:
        # Render at size directly for crisp glyphs (don't only downscale 1024 for 16).
        pad = 0.0 if size <= 32 else 0.125
        # Tiny sizes: less padding so DR stays readable.
        if size <= 16:
            pad = 0.06
        elif size <= 32:
            pad = 0.08
        icon = draw_monogram(size * 8, master.getpixel((512, 512)) if False else (0, 0, 0, 0), (0, 0, 0, 0))
        # Re-draw at target with palette from sibling — caller passes colors instead.
        raise RuntimeError("use export_palette")


def export_palette(pal: dict) -> Path:
    dest = OUT / pal["id"]
    dest.mkdir(parents=True, exist_ok=True)
    master = draw_monogram(1024, pal["bg"], pal["fg"], pad_ratio=0.125)
    master.save(dest / "master-1024.png")
    master.resize((128, 128), Image.Resampling.LANCZOS).save(dest / "preview-128.png")

    for size in SIZES:
        if size <= 16:
            pad = 0.05
        elif size <= 32:
            pad = 0.08
        else:
            pad = 0.125
        # Supersample then downscale for cleaner edges at small sizes.
        hi = draw_monogram(size * 8, pal["bg"], pal["fg"], pad_ratio=pad)
        icon = hi.resize((size, size), Image.Resampling.LANCZOS)
        icon.save(dest / f"icon{size}.png")

    # QA: 16px nearest ×8
    icon16 = Image.open(dest / "icon16.png")
    icon16.resize((128, 128), Image.Resampling.NEAREST).save(dest / "qa-16px-upscaled.png")

    # Preview sheet
    sheet = Image.new("RGBA", (720, 200), (236, 238, 241, 255))
    draw = ImageDraw.Draw(sheet)
    draw.text((16, 12), f"A · {pal['name']}", fill=(30, 30, 30, 255), font=load_font(22))
    x = 16
    for size in (128, 48, 32, 16):
        icon = Image.open(dest / f"icon{size}.png")
        sheet.paste(icon, (x, 56), icon)
        draw.text((x, 56 + size + 6), f"{size}", fill=(90, 90, 90, 255), font=load_font(14))
        x += size + 28
    # Dark toolbar strip
    draw.rounded_rectangle((520, 48, 700, 176), radius=12, fill=(22, 27, 34, 255))
    icon48 = Image.open(dest / "icon48.png")
    sheet.paste(icon48, (586, 88), icon48)
    draw.text((540, 160), "dark toolbar", fill=(160, 170, 180, 255), font=load_font(12))
    sheet.convert("RGB").save(dest / "preview-sheet.png")
    return dest


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    lines = [
        "# Variant A — palette options",
        "",
        "Same **DR monogram** as Variant A. Original teal `#0b6e6a` excluded.",
        "",
        "Pick a palette id (e.g. `a1-ink`). Then we copy that set into `icons/`.",
        "",
    ]
    for pal in PALETTES:
        dest = export_palette(pal)
        print(f"wrote {dest}")
        lines.append(f"## `{pal['id']}` — {pal['name']}")
        lines.append("")
        lines.append(pal["pitch"])
        lines.append("")
        lines.append(f"- Preview: `{pal['id']}/preview-sheet.png`")
        lines.append(f"- Sizes: `icon16/32/48/128.png`")
        lines.append("")
    (OUT / "README.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("done")


if __name__ == "__main__":
    main()
