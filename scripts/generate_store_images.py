#!/usr/bin/env python3
"""Generate Homey App Store images from the app icon palette."""

from pathlib import Path
from typing import Tuple

from PIL import Image, ImageDraw, ImageFont

BLUE = (26, 115, 232, 255)
BLUE_DARK = (21, 101, 192, 255)
BLUE_LIGHT = (66, 133, 244, 210)
BLUE_DEEP = (15, 76, 158, 200)
WHITE = (255, 255, 255, 255)
GREY = (95, 99, 104, 255)
GREY_LIGHT = (189, 193, 198, 255)
RED = (234, 67, 53, 255)

FONT_DIR = Path('/System/Library/Fonts/Supplemental')
FONT_TITLE = FONT_DIR / 'Arial Bold.ttf'

OUTPUTS = {
    'xlarge': (1000, 700),
    'large': (500, 350),
    'small': (250, 175),
}

DRIVER_OUTPUTS = {
    'xlarge': (1000, 1000),
    'large': (500, 500),
    'small': (75, 75),
}


def build_icon(size: int) -> Image.Image:
    """Draw the square icon in-memory so it can be reused on larger canvases."""
    icon = Image.new('RGBA', (size, size), BLUE)
    draw = ImageDraw.Draw(icon)
    scale = size / 100.0

    def rect_box(x: float, y: float, w: float, h: float) -> Tuple[float, float, float, float]:
        return (x * scale, y * scale, (x + w) * scale, (y + h) * scale)

    draw.rounded_rectangle(rect_box(25, 35, 50, 30), radius=5 * scale, fill=WHITE)
    draw.rectangle(rect_box(30, 43, 30, 4), fill=GREY)
    draw.rectangle(rect_box(30, 50, 20, 3), fill=GREY_LIGHT)
    circle_bounds = [
        (70 - 6) * scale,
        (30 - 6) * scale,
        (70 + 6) * scale,
        (30 + 6) * scale,
    ]
    draw.ellipse(circle_bounds, fill=RED)
    return icon


def fit_font(draw: ImageDraw.ImageDraw, text: str, max_width: int, target_size: int) -> ImageFont.FreeTypeFont:
    """Return the largest font that fits the given width."""
    size = target_size
    while size > 10:
        font = ImageFont.truetype(str(FONT_TITLE), size)
        text_width = draw.textbbox((0, 0), text, font=font)[2]
        if text_width <= max_width:
            return font
        size -= 2
    return ImageFont.truetype(str(FONT_TITLE), 10)


def compose_canvas(size: Tuple[int, int]) -> Image.Image:
    """Create the marketing canvas with background, icon and app title."""
    width, height = size
    canvas = Image.new('RGBA', size, BLUE)
    draw = ImageDraw.Draw(canvas)

    # Add soft background shapes for depth.
    draw.ellipse(
        (-int(width * 0.45), -int(height * 0.4), int(width * 0.65), int(height * 1.1)),
        fill=BLUE_DARK,
    )
    draw.ellipse(
        (int(width * 0.45), -int(height * 0.2), int(width * 1.2), int(height * 0.9)),
        fill=BLUE_LIGHT,
    )
    draw.rectangle(
        (int(width * 0.35), int(height * 0.7), int(width * 1.1), int(height * 1.05)),
        fill=BLUE_DEEP,
    )

    icon_size = int(height * 0.5)
    icon = build_icon(icon_size)
    icon_x = int(width * 0.1)
    icon_y = int((height - icon_size) / 2)
    canvas.paste(icon, (icon_x, icon_y), icon)

    title = 'Ntfy me'
    text_x = icon_x + icon_size + int(width * 0.06)
    max_text_width = width - text_x - int(width * 0.06)
    target_font_size = int(height * 0.2)
    title_font = fit_font(draw, title, max_text_width, target_font_size)
    text_bbox = draw.textbbox((0, 0), title, font=title_font)
    text_height = text_bbox[3] - text_bbox[1]
    text_y = icon_y + (icon_size - text_height) // 2
    draw.text((text_x, text_y), title, font=title_font, fill=WHITE)

    return canvas


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    out_dir = root / 'assets' / 'images'
    out_dir.mkdir(parents=True, exist_ok=True)

    base = compose_canvas(OUTPUTS['xlarge'])
    base_rgb = base.convert('RGB')
    base_rgb.save(out_dir / 'xlarge.png', optimize=True)

    for name in ('large', 'small'):
        resized = base_rgb.resize(OUTPUTS[name], Image.LANCZOS)
        resized.save(out_dir / f'{name}.png', optimize=True)

    driver_dir = root / 'drivers' / 'ntfy-me' / 'assets' / 'images'
    driver_dir.mkdir(parents=True, exist_ok=True)

    for name, size in DRIVER_OUTPUTS.items():
        icon = build_icon(size[0])
        icon_rgb = icon.convert('RGB')
        icon_rgb.save(driver_dir / f'{name}.png', optimize=True)


if __name__ == '__main__':
    main()
