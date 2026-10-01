import { disposeObject } from './dispose';
import {
  approximateWidth,
  LabelAtlas,
  measureLabel,
  planAtlas,
  wrapText,
  type AtlasCanvas,
  type LabelSpec,
} from './labels';

const spec = (id: string, lines: string[], extra: Partial<LabelSpec> = {}): LabelSpec => ({
  id,
  lines,
  color: 'cyan',
  ...extra,
});

/** A drawing surface that records what is drawn, so no real canvas is needed. */
function fakeCanvas() {
  const calls: {
    fonts: string[];
    texts: { text: string; x: number; y: number }[];
    panels: number;
  } = {
    fonts: [],
    texts: [],
    panels: 0,
  };
  const ctx = {
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    textBaseline: 'alphabetic',
    textAlign: 'left',
    fillRect: () => calls.panels++,
    strokeRect: () => undefined,
    clearRect: () => undefined,
    measureText: (text: string) => ({ width: text.length * 20 }),
    fillText(text: string, x: number, y: number) {
      calls.fonts.push(ctx.font);
      calls.texts.push({ text, x, y });
    },
  };
  const canvas: AtlasCanvas = { width: 0, height: 0, getContext: () => ctx as never };
  return { canvas, calls, ctx };
}

describe('measureLabel', () => {
  it('sizes a label to its widest line and its line count, with padding', () => {
    const one = measureLabel(spec('a', ['hello']));
    const three = measureLabel(spec('b', ['hello', 'a much longer line', 'x']));
    expect(three.width).toBeGreaterThan(one.width);
    expect(three.height).toBeGreaterThan(one.height * 2); // padding is paid once, lines three times
  });

  it('scales with the font size', () => {
    const small = measureLabel(spec('a', ['text'], { size: 20 }));
    const large = measureLabel(spec('a', ['text'], { size: 40 }));
    expect(large.width).toBeGreaterThan(small.width * 1.8);
  });

  it('uses the supplied measurer, so wide glyphs are not clipped', () => {
    const wide = measureLabel(spec('a', ['abcd']), () => 500);
    expect(wide.width).toBeGreaterThan(500);
    expect(approximateWidth('abcd', 40)).toBe(Math.ceil(4 * 40 * 0.6));
  });
});

describe('wrapText', () => {
  it('breaks at word boundaries without exceeding the limit', () => {
    const lines = wrapText(
      'Engineered with TypeScript and NestJS for strict domain boundaries',
      24,
    );
    expect(lines).toEqual([
      'Engineered with',
      'TypeScript and NestJS',
      'for strict domain',
      'boundaries',
    ]);
    for (const line of lines) expect(line.length).toBeLessThanOrEqual(24);
  });

  it('keeps every word, in order', () => {
    const text = 'one two three four five six seven';
    expect(wrapText(text, 10).join(' ')).toBe(text);
  });

  it('gives a word longer than the limit its own line instead of cutting it', () => {
    expect(wrapText('a supercalifragilistic b', 6)).toEqual(['a', 'supercalifragilistic', 'b']);
  });

  it('handles empty text and extra whitespace', () => {
    expect(wrapText('', 10)).toEqual([]);
    expect(wrapText('  spaced   out  ', 20)).toEqual(['spaced out']);
  });
});

describe('planAtlas', () => {
  const many = Array.from({ length: 14 }, (_, i) =>
    spec(`label-${i}`, [`line ${i}`, 'second line'], { size: 24 + (i % 3) * 8 }),
  );

  it('places every label inside the atlas, with none overlapping', () => {
    const plan = planAtlas(many);
    expect(plan.rects.size).toBe(many.length);
    const rects = [...plan.rects.values()];
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.x + r.width).toBeLessThanOrEqual(plan.width);
      expect(r.y + r.height).toBeLessThanOrEqual(plan.height);
    }
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i]!;
        const b = rects[j]!;
        const apart =
          a.x + a.width <= b.x ||
          b.x + b.width <= a.x ||
          a.y + a.height <= b.y ||
          b.y + b.height <= a.y;
        expect(apart).toBe(true);
      }
    }
  });

  it('is deterministic, and a power of two tall', () => {
    expect(planAtlas(many)).toEqual(planAtlas([...many].reverse()));
    const { height } = planAtlas(many);
    expect(Math.log2(height) % 1).toBe(0);
  });

  it('fails loudly when a label is wider than the atlas or the labels are too tall to fit', () => {
    expect(() => planAtlas([spec('wide', ['x'.repeat(200)])], approximateWidth, 256)).toThrow(
      RangeError,
    );
    const tall = Array.from({ length: 40 }, (_, i) =>
      spec(`t${i}`, ['a', 'b', 'c', 'd'], { size: 80 }),
    );
    expect(() => planAtlas(tall, approximateWidth, 1024, 512)).toThrow(RangeError);
  });
});

describe('LabelAtlas', () => {
  it('draws every line of every label into one canvas, using the HUD font', () => {
    const { canvas, calls } = fakeCanvas();
    const atlas = LabelAtlas.create(
      [spec('a', ['one', 'two'], { size: 30 }), spec('b', ['three'], { size: 50, panel: true })],
      { createCanvas: () => canvas },
    );

    expect(calls.texts.map((t) => t.text).sort()).toEqual(['one', 'three', 'two']);
    expect(calls.fonts.every((f) => f.includes('JetBrains Mono Variable'))).toBe(true);
    expect(calls.fonts.some((f) => f.includes('50px'))).toBe(true);
    expect(calls.panels).toBe(1); // only the label that asked for a panel
    expect(canvas.width).toBe(atlas.plan.width);
    expect(canvas.height).toBe(atlas.plan.height);
    disposeObject(atlas.mesh([{ id: 'a', position: [0, 0, 0], height: 1 }]));
  });

  it('centres text on request', () => {
    const { canvas, calls } = fakeCanvas();
    LabelAtlas.create([spec('c', ['mid'], { align: 'center' })], { createCanvas: () => canvas });
    const rect = planAtlas(
      [spec('c', ['mid'], { align: 'center' })],
      (t) => t.length * 20,
    ).rects.get('c')!;
    expect(calls.texts[0]!.x).toBeCloseTo(rect.x + rect.width / 2, 0);
  });

  it('still produces placements and quads when no canvas can draw text', () => {
    const atlas = LabelAtlas.create([spec('a', ['text'])], { createCanvas: () => null });
    const mesh = atlas.mesh([{ id: 'a', position: [1, 2, 3], height: 0.5 }]);
    expect(mesh.geometry.getAttribute('position').count).toBe(4);
    disposeObject(mesh);
  });

  it('builds quads of the right size and position, with uvs inside the atlas', () => {
    const { canvas } = fakeCanvas();
    const atlas = LabelAtlas.create([spec('a', ['hello']), spec('b', ['hello', 'there'])], {
      createCanvas: () => canvas,
    });
    const mesh = atlas.mesh([
      { id: 'a', position: [10, 5, -3], height: 2 },
      { id: 'b', position: [0, 0, 0], height: 1 },
    ]);
    const position = mesh.geometry.getAttribute('position');
    const uv = mesh.geometry.getAttribute('uv');

    expect(position.count).toBe(8);
    expect(mesh.geometry.getIndex()!.count).toBe(12);

    // Label "a": centred on its position, 2 units tall, as wide as its aspect says.
    const ys = [0, 1, 2, 3].map((i) => position.getY(i));
    const xs = [0, 1, 2, 3].map((i) => position.getX(i));
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(2, 5);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(2 * atlas.aspect('a'), 5);
    expect((Math.max(...xs) + Math.min(...xs)) / 2).toBeCloseTo(10, 5);
    expect(position.getZ(0)).toBeCloseTo(-3, 5);

    for (let i = 0; i < uv.count; i++) {
      expect(uv.getX(i)).toBeGreaterThanOrEqual(0);
      expect(uv.getX(i)).toBeLessThanOrEqual(1);
      expect(uv.getY(i)).toBeGreaterThanOrEqual(0);
      expect(uv.getY(i)).toBeLessThanOrEqual(1);
    }
    disposeObject(mesh);
  });

  it('turns a label about the vertical axis', () => {
    const { canvas } = fakeCanvas();
    const atlas = LabelAtlas.create([spec('a', ['hello'])], { createCanvas: () => canvas });
    const mesh = atlas.mesh([{ id: 'a', position: [0, 0, 0], height: 1, rotationY: Math.PI / 2 }]);
    const position = mesh.geometry.getAttribute('position');
    // A quarter turn lays the label along the z axis instead of x.
    expect(Math.abs(position.getX(0))).toBeLessThan(1e-9);
    expect(Math.abs(position.getZ(0))).toBeGreaterThan(0.1);
    disposeObject(mesh);
  });

  it('shares one material and texture between meshes, and releases them exactly once', () => {
    const { canvas } = fakeCanvas();
    const atlas = LabelAtlas.create([spec('a', ['x']), spec('b', ['y'])], {
      createCanvas: () => canvas,
    });
    const first = atlas.mesh([{ id: 'a', position: [0, 0, 0], height: 1 }]);
    const second = atlas.mesh([{ id: 'b', position: [0, 0, 0], height: 1 }]);
    expect(first.material).toBe(second.material);

    const group = { traverse: (fn: (o: unknown) => void) => [first, second].forEach(fn) };
    const counts = disposeObject(group as never);
    expect(counts).toEqual({ geometries: 2, materials: 1, textures: 1 });
  });

  it('refuses an unknown label id', () => {
    const atlas = LabelAtlas.create([spec('a', ['x'])], { createCanvas: () => null });
    expect(() => atlas.mesh([{ id: 'nope', position: [0, 0, 0], height: 1 }])).toThrow(
      'Unknown label',
    );
    expect(() => atlas.aspect('nope')).toThrow('Unknown label');
  });
});
