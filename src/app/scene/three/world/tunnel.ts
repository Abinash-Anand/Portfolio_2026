import {
  AdditiveBlending,
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Points,
  ShaderMaterial,
  TorusGeometry,
} from 'three';
import { disposeObject } from '../dispose';
import { tokenColor } from '../palette';
import { MAX_RINGS, MAX_TUNNEL_POINTS } from '../profiles';
import { createGlyphAtlas } from '../textures';
import { damp } from '../camera-rig';
import type { WorldPart } from './part';

/** How far the tunnel stretches ahead of the camera, in world units. */
export const TUNNEL_DEPTH = 120;
/** Travel speed while a packet is in flight, in world units per second. */
const FLIGHT_SPEED = 42;

const VERTEX = /* glsl */ `
  uniform float uOffset;
  uniform float uDepth;
  uniform float uPixel;
  attribute float aSeed;
  varying float vSeed;
  varying float vFade;
  void main() {
    vec3 p = position;
    // Each point travels at its own speed; the shared offset keeps motion continuous when the speed changes.
    p.z = mod(p.z + uOffset * (0.6 + 0.8 * aSeed), uDepth) - uDepth;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float d = -mv.z;
    gl_PointSize = clamp(uPixel * (7.0 + 11.0 * aSeed) / max(d, 1.0) * 10.0, 1.5, 30.0);
    vSeed = aSeed;
    vFade = smoothstep(uDepth, uDepth * 0.7, d) * smoothstep(0.5, 5.0, d);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform sampler2D uAtlas;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uMix;
  uniform float uAlpha;
  varying float vSeed;
  varying float vFade;
  void main() {
    // Half the points are zeros, half are ones. The atlas holds the two digits side by side.
    float cell = step(0.5, fract(vSeed * 7.31));
    vec2 uv = vec2((gl_PointCoord.x + cell) * 0.5, 1.0 - gl_PointCoord.y);
    float glyph = texture2D(uAtlas, uv).r;
    if (glyph < 0.5) discard;
    gl_FragColor = vec4(mix(uColorA, uColorB, uMix), glyph * vFade * uAlpha);
    #include <colorspace_fragment>
  }
`;

/**
 * The fibre-optic data channel: streaming 0s and 1s (GPU points drawn from a digit atlas) plus light rings.
 * Request packets are cyan; the response, later, is gold. All motion happens in the vertex shader.
 */
export class Tunnel implements WorldPart {
  readonly object = new Group();

  private readonly geometry = new BufferGeometry();
  private readonly material: ShaderMaterial;
  private readonly rings: InstancedMesh;
  private readonly ringMatrix = new Matrix4();
  private ringCount = MAX_RINGS;
  private offset = 0;
  private speed = 0;
  private targetSpeed = 0;
  private mix = 0;
  private targetMix = 0;

  constructor(random: () => number = Math.random) {
    const positions = new Float32Array(MAX_TUNNEL_POINTS * 3);
    const seeds = new Float32Array(MAX_TUNNEL_POINTS);
    for (let i = 0; i < MAX_TUNNEL_POINTS; i++) {
      const angle = random() * Math.PI * 2;
      const radius = 1.6 + Math.pow(random(), 0.7) * 6.5; // a hollow channel: nothing in the middle
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius;
      positions[i * 3 + 2] = -random() * TUNNEL_DEPTH;
      seeds[i] = random();
    }
    this.geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    this.geometry.setAttribute('aSeed', new Float32BufferAttribute(seeds, 1));

    this.material = new ShaderMaterial({
      uniforms: {
        uOffset: { value: 0 },
        uDepth: { value: TUNNEL_DEPTH },
        uPixel: { value: 1 },
        uAtlas: { value: createGlyphAtlas() },
        uColorA: { value: tokenColor('cyan').clone() },
        uColorB: { value: tokenColor('gold').clone() },
        uMix: { value: 0 },
        uAlpha: { value: 1 },
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    const points = new Points(this.geometry, this.material);
    points.frustumCulled = false; // the shader moves points; the stored bounds are meaningless
    this.object.add(points);

    // Light rings along the channel.
    const ringMaterial = new MeshBasicMaterial({
      color: tokenColor('blue'),
      transparent: true,
      opacity: 0.5,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    this.rings = new InstancedMesh(new TorusGeometry(5.6, 0.018, 4, 72), ringMaterial, MAX_RINGS);
    this.rings.frustumCulled = false;
    this.object.add(this.rings);

    this.object.visible = false;
  }

  /** Point count visible (the rest stay allocated; changing it never rebuilds geometry). */
  setPointCount(count: number): void {
    this.geometry.setDrawRange(0, Math.min(count, MAX_TUNNEL_POINTS));
  }

  setRingCount(count: number): void {
    this.ringCount = Math.min(count, MAX_RINGS);
    this.rings.count = this.ringCount;
  }

  /** Scales point sprites with the drawing-buffer height, so they look the same at any resolution. */
  setPixelScale(scale: number): void {
    this.material.uniforms['uPixel']!.value = scale;
  }

  /** In flight: streams at speed. Otherwise it eases to a stop and hides. */
  setFlying(flying: boolean): void {
    this.targetSpeed = flying ? FLIGHT_SPEED : 0;
    if (flying) this.object.visible = true;
  }

  /** 0 = request (cyan), 1 = response (gold). */
  setReturning(returning: boolean): void {
    this.targetMix = returning ? 1 : 0;
  }

  get visibleNow(): boolean {
    return this.object.visible;
  }

  update(dt: number): void {
    if (!this.object.visible) return;
    this.speed = damp(this.speed, this.targetSpeed, 3, dt);
    this.mix = damp(this.mix, this.targetMix, 4, dt);
    this.offset += this.speed * dt;
    this.material.uniforms['uOffset']!.value = this.offset;
    this.material.uniforms['uMix']!.value = this.mix;

    for (let i = 0; i < this.ringCount; i++) {
      const z = -((((i / this.ringCount) * TUNNEL_DEPTH + this.offset) % TUNNEL_DEPTH) + 0.0001);
      this.ringMatrix.makeTranslation(0, 0, z);
      this.rings.setMatrixAt(i, this.ringMatrix);
    }
    this.rings.instanceMatrix.needsUpdate = true;

    if (this.targetSpeed === 0 && this.speed < 0.5) this.object.visible = false;
  }

  dispose() {
    return disposeObject(this.object);
  }
}
