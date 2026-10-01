import {
  DataTexture,
  LinearFilter,
  NearestFilter,
  RedFormat,
  RGBAFormat,
  UnsignedByteType,
} from 'three';

/**
 * Procedural textures: generated in code from tiny bitmaps and math, so the download cost is zero and nothing
 * needs a canvas or an image decoder (DESIGN.md section 9, asset budget).
 */

/** 5x7 pixel digits, top row first. `#` is lit. */
const GLYPHS: readonly (readonly string[])[] = [
  ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'], // 0
  ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'], // 1
];

export const GLYPH_CELL = 8;
export const GLYPH_COUNT = GLYPHS.length;

/** Whether pixel (x, y) of glyph `cell` is lit; (0, 0) is the top-left of the 8x8 cell. For tests and tools. */
export function glyphPixel(cell: number, x: number, y: number): boolean {
  const row = GLYPHS[cell]?.[y];
  return !!row && x >= 1 && x <= 5 && row[x - 1] === '#';
}

/** A 16x8 single-channel atlas holding the digits "0" and "1" (cell 0 and cell 1, left to right). */
export function createGlyphAtlas(): DataTexture {
  const width = GLYPH_CELL * GLYPH_COUNT;
  const height = GLYPH_CELL;
  const data = new Uint8Array(width * height);
  for (let cell = 0; cell < GLYPH_COUNT; cell++) {
    for (let y = 0; y < GLYPH_CELL; y++) {
      for (let x = 0; x < GLYPH_CELL; x++) {
        // Texture row 0 is the BOTTOM of the image, so store the glyph upside down in memory.
        const row = GLYPH_CELL - 1 - y;
        data[row * width + cell * GLYPH_CELL + x] = glyphPixel(cell, x, y) ? 255 : 0;
      }
    }
  }
  const texture = new DataTexture(data, width, height, RedFormat, UnsignedByteType);
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;
  return texture;
}

/** A soft radial falloff (white, alpha fading to 0 at the edge), for additive glow sprites. */
export function createRadialGlow(size = 64): DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5) / size - 0.5;
      const dy = (y + 0.5) / size - 0.5;
      const falloff = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) * 2);
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = 255;
      data[i + 3] = Math.round(255 * falloff * falloff);
    }
  }
  const texture = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}
