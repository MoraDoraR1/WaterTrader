"""Normalize generated character cutouts for the in-game Canvas2D renderer."""

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "assets" / "characters"
SPRITE_SIZE = (144, 216)
CONTENT_SIZE = (132, 204)


def main() -> None:
    sources = sorted(ASSET_DIR.glob("*.png"))
    sources = [path for path in sources if path.name != "character-contact-sheet.png"]
    sheet = Image.new("RGBA", (720, 780), (24, 31, 34, 255))
    draw = ImageDraw.Draw(sheet)

    for index, source in enumerate(sources):
        image = Image.open(source).convert("RGBA")
        alpha_box = image.getchannel("A").getbbox()
        if not alpha_box:
            raise ValueError(f"No visible pixels in {source}")
        image = image.crop(alpha_box)
        image.thumbnail(CONTENT_SIZE, Image.Resampling.LANCZOS)

        sprite = Image.new("RGBA", SPRITE_SIZE, (0, 0, 0, 0))
        sprite.paste(image, ((SPRITE_SIZE[0] - image.width) // 2, SPRITE_SIZE[1] - image.height - 4), image)
        sprite.save(source.with_suffix(".webp"), "WEBP", quality=92, method=6)

        col, row = index % 4, index // 4
        sheet.paste(sprite, (18 + col * 176, 28 + row * 252), sprite)
        draw.text((18 + col * 176, 246 + row * 252), source.stem, fill=(238, 226, 202, 255))

    sheet.save(ASSET_DIR / "character-contact-sheet.png")
    print(f"processed {len(sources)} character sprites")


if __name__ == "__main__":
    main()
