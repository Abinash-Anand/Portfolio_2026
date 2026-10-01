import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Points,
  ShaderMaterial,
} from 'three';
import type { ColorToken } from '../../../core/design/tokens';
import { tokenColor } from '../palette';

/** Shared building blocks for the rooms: small, cheap, instanced-friendly pieces. */

export const FLOOR_Y = -1.2;

/** Deterministic pseudo-random in [0, 1) from an integer, so a room looks the same every time. */
export function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Seeded generator from a string (a project slug, a room id), so generated art is stable per input. */
export function seededRandom(seed: string): () => number {
  let state = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    state = Math.imul(state ^ seed.charCodeAt(i), 16777619);
  }
  return () => {
    state = Math.imul(state ^ (state >>> 15), 2246822519);
    state = Math.imul(state ^ (state >>> 13), 3266489917);
    state ^= state >>> 16;
    return (state >>> 0) / 4294967296;
  };
}

export const clamp = (value: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, value));
export const smoothstep = (a: number, b: number, value: number): number => {
  const t = clamp((value - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** A rectangular grid of lines on a horizontal plane, as line-segment pairs. */
export function gridGeometry(
  halfWidth: number,
  near: number,
  far: number,
  step: number,
  y: number,
  originX = 0,
): BufferGeometry {
  const positions: number[] = [];
  for (let x = -halfWidth; x <= halfWidth; x += step) {
    positions.push(originX + x, y, near, originX + x, y, far);
  }
  const zStart = Math.min(near, far);
  const zEnd = Math.max(near, far);
  for (let z = zStart; z <= zEnd; z += step) {
    positions.push(originX - halfWidth, y, z, originX + halfWidth, y, z);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  return geometry;
}

/** Line segments from flat coordinate pairs `[ax, ay, az, bx, by, bz, ...]`. */
export function segmentsGeometry(coordinates: readonly number[]): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(coordinates as number[], 3));
  return geometry;
}

const LED_VERTEX = /* glsl */ `
  varying float vHash;
  varying float vY;
  varying float vDepth;
  void main() {
    vHash = fract(sin(float(gl_InstanceID) * 12.9898) * 43758.5453);
    vY = position.y;
    #ifdef USE_INSTANCING
      mat4 m = instanceMatrix;
    #else
      mat4 m = mat4(1.0);
    #endif
    vec4 mv = modelViewMatrix * m * vec4(position, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const LED_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec2 uFade;
  varying float vHash;
  varying float vY;
  varying float vDepth;
  void main() {
    float pulse = 0.5 + 0.5 * sin(uTime * (1.0 + 2.0 * vHash) + vHash * 40.0 + vY * 1.6);
    vec3 color = mix(uColorA, uColorB, step(0.5, fract(vHash * 3.7)));
    float fade = smoothstep(uFade.x, uFade.y, vDepth);
    gl_FragColor = vec4(color, (0.25 + 0.75 * pulse) * fade);
    #include <colorspace_fragment>
  }
`;

/**
 * Pulsing indicator lights for instanced meshes: each instance blinks at its own rate and picks one of two colors.
 * `uTime` is advanced by the room; the shader does the rest on the GPU.
 */
export function createLedMaterial(
  a: ColorToken,
  b: ColorToken,
  fade: readonly [number, number] = [64, 8],
): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColorA: { value: tokenColor(a).clone() },
      uColorB: { value: tokenColor(b).clone() },
      uFade: { value: [fade[0], fade[1]] },
    },
    vertexShader: LED_VERTEX,
    fragmentShader: LED_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
}

export function setLedColors(material: ShaderMaterial, a: ColorToken, b: ColorToken): void {
  (material.uniforms['uColorA']!.value as Color).copy(tokenColor(a));
  (material.uniforms['uColorB']!.value as Color).copy(tokenColor(b));
}

const PULSE_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  attribute vec3 aEnd;
  attribute float aPhase;
  attribute float aSpeed;
  varying float vAlpha;
  void main() {
    float f = fract(uTime * aSpeed + aPhase);
    vec3 p = mix(position, aEnd, f);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp(uSize / max(-mv.z, 1.0), 1.5, 14.0);
    vAlpha = sin(f * 3.14159265);
  }
`;

const PULSE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float falloff = smoothstep(0.5, 0.0, length(d));
    gl_FragColor = vec4(uColor, falloff * vAlpha);
    #include <colorspace_fragment>
  }
`;

export interface PulseSegment {
  readonly from: readonly [number, number, number];
  readonly to: readonly [number, number, number];
}

export interface PulseField {
  readonly points: Points;
  /** Visible pulses (the rest stay allocated). */
  setCount(count: number): void;
  setPixelScale(scale: number): void;
  update(now: number): void;
}

/**
 * Glowing dots that travel along line segments: data moving through a circuit, a queue, a graph. One draw call;
 * the motion is entirely in the vertex shader (`position` is where a pulse starts, `aEnd` where it ends).
 * `perSegment` pulses ride each segment, offset in phase so the flow looks continuous.
 */
export function createPulseField(
  segments: readonly PulseSegment[],
  perSegment: number,
  color: ColorToken,
  random: () => number = () => 0.5,
): PulseField {
  const total = segments.length * perSegment;
  const starts = new Float32Array(total * 3);
  const ends = new Float32Array(total * 3);
  const phases = new Float32Array(total);
  const speeds = new Float32Array(total);
  let i = 0;
  // Interleave: pulse k of every segment comes before pulse k + 1, so trimming the count thins every segment evenly.
  for (let k = 0; k < perSegment; k++) {
    for (const segment of segments) {
      starts.set(segment.from, i * 3);
      ends.set(segment.to, i * 3);
      phases[i] = (k + random() * 0.8) / perSegment;
      speeds[i] = 0.15 + random() * 0.25;
      i++;
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(starts, 3));
  geometry.setAttribute('aEnd', new Float32BufferAttribute(ends, 3));
  geometry.setAttribute('aPhase', new Float32BufferAttribute(phases, 1));
  geometry.setAttribute('aSpeed', new Float32BufferAttribute(speeds, 1));

  const material = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: 120 },
      uColor: { value: tokenColor(color).clone() },
    },
    vertexShader: PULSE_VERTEX,
    fragmentShader: PULSE_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const points = new Points(geometry, material);
  points.frustumCulled = false; // the shader moves the points; stored bounds mean nothing
  geometry.setDrawRange(0, total);

  return {
    points,
    setCount: (count) => geometry.setDrawRange(0, Math.min(total, Math.max(0, count))),
    setPixelScale: (scale) => {
      material.uniforms['uSize']!.value = 120 * scale;
    },
    update: (now) => {
      material.uniforms['uTime']!.value = now;
    },
  };
}
