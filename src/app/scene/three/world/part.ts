import type { Object3D } from 'three';
import type { DisposeCounts } from '../dispose';

/** One self-contained piece of the world: a scene-graph root, a per-frame update, and a complete teardown. */
export interface WorldPart {
  readonly object: Object3D;
  update(dt: number, now: number): void;
  /** Releases every GPU resource this part created. */
  dispose(): DisposeCounts;
}
