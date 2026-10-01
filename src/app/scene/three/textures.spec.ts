import {
  createGlyphAtlas,
  createRadialGlow,
  GLYPH_CELL,
  GLYPH_COUNT,
  glyphPixel,
} from './textures';

function litPixels(data: Uint8Array, width: number, cell: number): number {
  let lit = 0;
  for (let row = 0; row < GLYPH_CELL; row++) {
    for (let x = 0; x < GLYPH_CELL; x++) {
      if (data[row * width + cell * GLYPH_CELL + x]! > 0) lit++;
    }
  }
  return lit;
}

describe('procedural textures', () => {
  it('draws the digits from a 5x7 bitmap inside an 8x8 cell', () => {
    // "0": the top edge is three lit pixels, the corners are not.
    expect([0, 1, 2, 3, 4, 5, 6].map((x) => glyphPixel(0, x, 0))).toEqual([
      false,
      false,
      true,
      true,
      true,
      false,
      false,
    ]);
    // "1": a vertical stroke down the middle, a foot at the bottom.
    expect(glyphPixel(1, 3, 3)).toBe(true);
    expect(glyphPixel(1, 2, 6)).toBe(true);
    expect(glyphPixel(1, 1, 3)).toBe(false);
    // Outside the bitmap there is nothing.
    expect(glyphPixel(0, 3, 7)).toBe(false);
    expect(glyphPixel(5, 3, 3)).toBe(false);
  });

  it('packs both digits side by side into one single-channel atlas', () => {
    const atlas = createGlyphAtlas();
    const width = GLYPH_CELL * GLYPH_COUNT;
    const data = atlas.image.data as Uint8Array;
    expect(atlas.image.width).toBe(width);
    expect(atlas.image.height).toBe(GLYPH_CELL);
    expect(data.length).toBe(width * GLYPH_CELL);
    expect(litPixels(data, width, 0)).toBe(19); // the lit pixels of "0"
    expect(litPixels(data, width, 1)).toBe(10); // the lit pixels of "1"
    atlas.dispose();
  });

  it('stores the glyphs upside down in memory, because texture row 0 is the bottom of the image', () => {
    const atlas = createGlyphAtlas();
    const data = atlas.image.data as Uint8Array;
    const width = GLYPH_CELL * GLYPH_COUNT;
    const topOfZeroInMemory = (GLYPH_CELL - 1) * width + 2; // glyph row 0, x = 2: lit
    expect(data[topOfZeroInMemory]).toBe(255);
    expect(data[2]).toBe(0); // memory row 0 is the empty bottom row of the cell
    atlas.dispose();
  });

  it('makes a radial glow that is bright in the middle and fully transparent at the corners', () => {
    const size = 32;
    const glow = createRadialGlow(size);
    const data = glow.image.data as Uint8Array;
    const alpha = (x: number, y: number): number => data[(y * size + x) * 4 + 3]!;
    expect(alpha(size / 2, size / 2)).toBeGreaterThan(230);
    expect(alpha(0, 0)).toBe(0);
    expect(alpha(size - 1, size - 1)).toBe(0);
    expect(alpha(8, 16)).toBeLessThan(alpha(16, 16));
    glow.dispose();
  });
});
