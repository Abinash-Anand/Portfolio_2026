import {
  BufferGeometry,
  CanvasTexture,
  DataTexture,
  DoubleSide,
  Float32BufferAttribute,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  MeshBasicMaterial,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
  type Texture,
} from 'three';
import { COLORS, type ColorToken } from '../../core/design/tokens';

/**
 * Text in the 3D world. All the labels of a room are drawn once into ONE atlas texture (a canvas), and each group
 * of labels becomes one mesh of textured quads: a room's whole text costs a single texture and a few draw calls,
 * with no per-frame work. The 3D text is decoration for the eye (the canvas is `aria-hidden`); the same words
 * exist as real DOM text in the panel, which is what assistive technology reads.
 */

const FONT_STACK = '"JetBrains Mono Variable", ui-monospace, "Cascadia Code", Consolas, monospace';
const FONT_WEIGHT = 600;
const LINE_HEIGHT = 1.35;
const PADDING_FACTOR = 0.45;
/** Pixels between labels in the atlas, so mip-mapping never bleeds one label into the next. */
const GAP = 6;
/** A monospace glyph is about 0.6 of the font size wide; used when no canvas can measure text. */
const FALLBACK_GLYPH_WIDTH = 0.6;

export interface LabelSpec {
  readonly id: string;
  readonly lines: readonly string[];
  readonly color: ColorToken;
  /** Font size in atlas pixels. Larger text stays sharper at a distance but costs atlas space. Default 40. */
  readonly size?: number;
  /** Draws a translucent panel with a thin border behind the text. */
  readonly panel?: boolean;
  /** Border color of the panel. Defaults to the text color. */
  readonly accent?: ColorToken;
  readonly align?: 'left' | 'center';
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface AtlasPlan {
  readonly width: number;
  readonly height: number;
  readonly rects: ReadonlyMap<string, Rect>;
}

const sizeOf = (spec: LabelSpec): number => spec.size ?? 40;
const paddingOf = (spec: LabelSpec): number => Math.round(sizeOf(spec) * PADDING_FACTOR);
const lineHeightOf = (spec: LabelSpec): number => Math.round(sizeOf(spec) * LINE_HEIGHT);

/** Width in pixels of one line of text. */
export type TextMeasurer = (text: string, size: number) => number;

export const approximateWidth: TextMeasurer = (text, size) =>
  Math.ceil(text.length * size * FALLBACK_GLYPH_WIDTH);

/** The pixel size a label needs: its widest line plus padding, and its lines plus padding. */
export function measureLabel(
  spec: LabelSpec,
  measureText: TextMeasurer = approximateWidth,
): { width: number; height: number } {
  const padding = paddingOf(spec);
  const widest = Math.max(1, ...spec.lines.map((line) => measureText(line, sizeOf(spec))));
  return {
    width: Math.ceil(widest + padding * 2),
    height: lineHeightOf(spec) * spec.lines.length + padding * 2,
  };
}

/**
 * Breaks text into lines of at most `maxChars` characters at word boundaries (a monospace font, so characters
 * are a fair measure of width). A single word longer than the limit keeps its own line rather than being cut.
 */
export function wrapText(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && line.length + 1 + word.length > maxChars) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

const nextPowerOfTwo = (value: number): number => 2 ** Math.ceil(Math.log2(Math.max(1, value)));

/**
 * Packs labels into rows ("shelves") of an atlas `width` pixels wide, tallest first. Pure and deterministic.
 * Throws when the labels do not fit in `maxHeight`: that is a build-time mistake, never a runtime condition.
 */
export function planAtlas(
  specs: readonly LabelSpec[],
  measureText: TextMeasurer = approximateWidth,
  width = 1024,
  maxHeight = 2048,
): AtlasPlan {
  const sized = specs
    .map((spec) => ({ spec, ...measureLabel(spec, measureText) }))
    .sort((a, b) => b.height - a.height || a.spec.id.localeCompare(b.spec.id));

  const rects = new Map<string, Rect>();
  let x = 0;
  let y = 0;
  let rowHeight = 0;
  for (const { spec, width: w, height: h } of sized) {
    if (w > width)
      throw new RangeError(`Label "${spec.id}" is ${w}px wide; the atlas is ${width}px`);
    if (x + w > width) {
      y += rowHeight + GAP;
      x = 0;
      rowHeight = 0;
    }
    rects.set(spec.id, { x, y, width: w, height: h });
    x += w + GAP;
    rowHeight = Math.max(rowHeight, h);
  }
  const height = nextPowerOfTwo(y + rowHeight);
  if (height > maxHeight)
    throw new RangeError(`Labels need an atlas ${height}px tall (max ${maxHeight})`);
  return { width, height, rects };
}

/** Where one label sits in the world. The label is centred on `position` and faces +z, turned by `rotationY`. */
export interface LabelPlacement {
  readonly id: string;
  readonly position: readonly [number, number, number];
  /** World height of the label; its width follows from its aspect ratio. */
  readonly height: number;
  readonly rotationY?: number;
  /** Tilts the label about the x axis (radians). */
  readonly rotationX?: number;
}

type DrawingContext = Pick<
  CanvasRenderingContext2D,
  | 'font'
  | 'fillStyle'
  | 'strokeStyle'
  | 'lineWidth'
  | 'textBaseline'
  | 'textAlign'
  | 'fillRect'
  | 'strokeRect'
  | 'fillText'
  | 'measureText'
  | 'clearRect'
>;

export interface AtlasCanvas {
  width: number;
  height: number;
  getContext(kind: '2d'): DrawingContext | null;
}

export interface LabelAtlasOptions {
  readonly width?: number;
  /** Creates the drawing surface. Defaults to a DOM canvas; tests supply a fake. */
  readonly createCanvas?: () => AtlasCanvas | null;
}

function domCanvas(): AtlasCanvas | null {
  return typeof document === 'undefined'
    ? null
    : (document.createElement('canvas') as unknown as AtlasCanvas);
}

const fontOf = (spec: LabelSpec): string => `${FONT_WEIGHT} ${sizeOf(spec)}px ${FONT_STACK}`;

function drawLabel(ctx: DrawingContext, spec: LabelSpec, rect: Rect): void {
  const padding = paddingOf(spec);
  if (spec.panel) {
    ctx.fillStyle = 'rgba(15, 20, 27, 0.78)';
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    ctx.strokeStyle = COLORS[spec.accent ?? spec.color];
    ctx.lineWidth = 2;
    ctx.strokeRect(rect.x + 1, rect.y + 1, rect.width - 2, rect.height - 2);
  }
  ctx.font = fontOf(spec);
  ctx.fillStyle = COLORS[spec.color];
  ctx.textBaseline = 'middle';
  const center = spec.align === 'center';
  ctx.textAlign = center ? 'center' : 'left';
  const x = center ? rect.x + rect.width / 2 : rect.x + padding;
  spec.lines.forEach((line, i) => {
    ctx.fillText(line, x, rect.y + padding + lineHeightOf(spec) * (i + 0.5));
  });
}

/**
 * One atlas texture plus the means to build meshes from parts of it. Create it once per room; dispose it with the
 * room (`disposeObject` on the meshes releases the shared material and texture exactly once).
 */
export class LabelAtlas {
  readonly texture: Texture;
  readonly material: MeshBasicMaterial;
  readonly plan: AtlasPlan;

  private constructor(plan: AtlasPlan, texture: Texture) {
    this.plan = plan;
    this.texture = texture;
    this.material = new MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      toneMapped: false,
    });
  }

  static create(specs: readonly LabelSpec[], options: LabelAtlasOptions = {}): LabelAtlas {
    const canvas = (options.createCanvas ?? domCanvas)();
    const ctx = canvas?.getContext('2d') ?? null;

    // Measure with the real font when a canvas exists, so wide glyphs are never clipped.
    let measure: TextMeasurer = approximateWidth;
    const fonts = new Map(specs.map((spec) => [sizeOf(spec), fontOf(spec)]));
    if (ctx) {
      measure = (text, size) => {
        ctx.font = fonts.get(size) ?? `${FONT_WEIGHT} ${size}px ${FONT_STACK}`;
        return Math.ceil(ctx.measureText(text).width);
      };
    }
    const plan = planAtlas(specs, measure, options.width);

    if (!canvas || !ctx) {
      // No way to draw text (a test environment, or a browser without 2D canvas): quads still exist, blank.
      const blank = new DataTexture(
        new Uint8Array([0, 0, 0, 0]),
        1,
        1,
        RGBAFormat,
        UnsignedByteType,
      );
      blank.needsUpdate = true;
      return new LabelAtlas(plan, blank);
    }

    canvas.width = plan.width;
    canvas.height = plan.height;
    ctx.clearRect(0, 0, plan.width, plan.height);
    for (const spec of specs) drawLabel(ctx, spec, plan.rects.get(spec.id)!);

    const texture = new CanvasTexture(canvas as unknown as HTMLCanvasElement);
    texture.colorSpace = SRGBColorSpace;
    texture.generateMipmaps = true;
    texture.minFilter = LinearMipmapLinearFilter;
    texture.magFilter = LinearFilter;
    texture.anisotropy = 4;
    return new LabelAtlas(plan, texture);
  }

  /** Width divided by height of a label, for sizing things around it. */
  aspect(id: string): number {
    const rect = this.rect(id);
    return rect.width / rect.height;
  }

  /** Builds one mesh holding a quad for each placement. All meshes of an atlas share its material and texture. */
  mesh(placements: readonly LabelPlacement[]): Mesh {
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    placements.forEach((placement, quad) => {
      const rect = this.rect(placement.id);
      const halfH = placement.height / 2;
      const halfW = (halfH * rect.width) / rect.height;
      const [px, py, pz] = placement.position;
      const cosY = Math.cos(placement.rotationY ?? 0);
      const sinY = Math.sin(placement.rotationY ?? 0);
      const cosX = Math.cos(placement.rotationX ?? 0);
      const sinX = Math.sin(placement.rotationX ?? 0);

      // Corner order: bottom-left, bottom-right, top-right, top-left.
      const corners: readonly (readonly [number, number])[] = [
        [-halfW, -halfH],
        [halfW, -halfH],
        [halfW, halfH],
        [-halfW, halfH],
      ];
      for (const [cx, cy] of corners) {
        // Tilt about x, then turn about y, then move.
        const ty = cy * cosX;
        const tz = cy * sinX;
        positions.push(px + cx * cosY + tz * sinY, py + ty, pz - cx * sinY + tz * cosY);
      }

      // The atlas canvas has its origin top-left; texture v runs upward.
      const u0 = rect.x / this.plan.width;
      const u1 = (rect.x + rect.width) / this.plan.width;
      const vTop = 1 - rect.y / this.plan.height;
      const vBottom = 1 - (rect.y + rect.height) / this.plan.height;
      uvs.push(u0, vBottom, u1, vBottom, u1, vTop, u0, vTop);

      const base = quad * 4;
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    });

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    const mesh = new Mesh(geometry, this.material);
    mesh.renderOrder = 10; // after the opaque world, so text blends over what is behind it
    return mesh;
  }

  private rect(id: string): Rect {
    const rect = this.plan.rects.get(id);
    if (!rect) throw new Error(`Unknown label "${id}"`);
    return rect;
  }
}
