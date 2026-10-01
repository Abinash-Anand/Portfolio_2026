import type { Object3D } from 'three';
import type { EndpointId } from '../../core/experience';
import { ReadinessScheduler, type ScheduleOptions, type TaskSteps } from '../readiness-scheduler';
import type { Room, RoomContext, RoomLoader } from './room';

/** The current room plus the one being prepared: the memory budget for rooms. */
const MAX_ROOMS = 2;

export interface RoomManagerOptions {
  /** The scene-graph node rooms are added to. */
  readonly parent: Object3D;
  readonly loaders: Readonly<Record<EndpointId, RoomLoader>>;
  readonly scheduler: ReadinessScheduler;
  /** The content and profile a room is built from, read at the moment it is built. */
  readonly context: () => RoomContext;
  /** Resolves when what rooms draw with (the label font) is ready. */
  readonly ready?: () => Promise<unknown>;
  /** Called right after a room is built, for example to queue its warm-up draw. */
  readonly onBuilt?: (room: Room) => void;
  readonly clock?: () => number;
}

interface Built {
  readonly room: Room;
  used: number;
}

/**
 * Owns the rooms of the world: loads each one's code on demand (its own chunk), builds it through the
 * ReadinessScheduler so building never costs a frame, shows one at a time, and releases the ones that are no longer
 * needed. Pure scene-graph work (no renderer), so it is unit-tested with fake rooms.
 */
export class RoomManager {
  private readonly built = new Map<EndpointId, Built>();
  private readonly inflight = new Map<EndpointId, Promise<Room | null>>();
  private readonly wanted = new Map<EndpointId, ScheduleOptions>();
  private readonly clock: () => number;
  private currentId: EndpointId | null = null;
  private counter = 0;
  /** Bumped whenever everything is thrown away, so builds that were in flight are dropped on arrival. */
  private generation = 0;

  /** How long each room took to build, in ms (the benchmark reads this). */
  readonly buildMs = new Map<EndpointId, number>();
  /** Rooms whose code or construction failed. The DOM panel still shows their content. */
  readonly failed = new Set<EndpointId>();

  constructor(private readonly options: RoomManagerOptions) {
    this.clock = options.clock ?? (() => performance.now());
  }

  get current(): Room | null {
    return this.currentId ? (this.built.get(this.currentId)?.room ?? null) : null;
  }

  get ids(): readonly EndpointId[] {
    return [...this.built.keys()];
  }

  get(id: EndpointId): Room | undefined {
    return this.built.get(id)?.room;
  }

  /**
   * Loads and builds a room in the background. Calling it again for the same room, with more urgency, speeds up
   * the work already underway instead of starting it twice.
   */
  prepare(id: EndpointId, options: ScheduleOptions = {}): Promise<Room | null> {
    const have = this.built.get(id);
    if (have) return Promise.resolve(have.room);

    this.wanted.set(id, mergeOptions(this.wanted.get(id), options));
    const running = this.inflight.get(id);
    if (running) {
      this.options.scheduler.boost(taskId(id), this.wanted.get(id)!);
      return running;
    }
    const promise = this.build(id, this.generation);
    this.inflight.set(id, promise);
    return promise;
  }

  /** Makes a built room the visible one. Returns it, or null when it has not been built yet. */
  show(id: EndpointId): Room | null {
    const entry = this.built.get(id);
    if (!entry) return null;
    if (this.currentId && this.currentId !== id) this.built.get(this.currentId)?.room.hide();
    this.currentId = id;
    entry.used = ++this.counter;
    entry.room.show();
    this.evict();
    return entry.room;
  }

  hide(): void {
    this.current?.hide();
    this.currentId = null;
  }

  /** Throws every room away (the content they were built from changed). They are rebuilt on demand. */
  invalidate(): void {
    this.generation++;
    for (const id of this.inflight.keys()) this.options.scheduler.cancel(taskId(id));
    this.inflight.clear();
    this.wanted.clear();
    this.currentId = null;
    for (const [id, entry] of this.built) this.release(id, entry);
  }

  dispose(): void {
    this.invalidate();
    this.buildMs.clear();
  }

  private async build(id: EndpointId, generation: number): Promise<Room | null> {
    const { scheduler, loaders, ready } = this.options;
    this.failed.delete(id);
    try {
      const [factory] = await Promise.all([loaders[id](), ready?.()]);
      if (generation !== this.generation) return null;

      const result: { room: Room | null } = { room: null };
      await scheduler.schedule(
        taskId(id),
        () => this.construct(id, factory, result),
        this.wanted.get(id) ?? {},
      );

      const built = result.room;
      if (generation !== this.generation || !built) {
        built?.dispose();
        return null;
      }
      built.hide();
      this.options.parent.add(built.object);
      this.built.set(id, { room: built, used: ++this.counter });
      this.inflight.delete(id);
      this.wanted.delete(id);
      this.options.onBuilt?.(built);
      this.evict();
      return built;
    } catch {
      if (generation === this.generation) {
        this.failed.add(id);
        this.inflight.delete(id);
        this.wanted.delete(id);
      }
      return null;
    }
  }

  /** The scheduled step that builds a room, timed. A single step: keep room construction cheap. */
  private *construct(
    id: EndpointId,
    factory: (context: RoomContext) => Room,
    result: { room: Room | null },
  ): TaskSteps {
    const started = this.clock();
    result.room = factory(this.options.context());
    this.buildMs.set(id, this.clock() - started);
    yield;
  }

  /** Keeps the memory budget: drops the least recently used rooms beyond the limit, never the visible one. */
  private evict(): void {
    while (this.built.size > MAX_ROOMS) {
      let oldest: EndpointId | null = null;
      for (const [id, entry] of this.built) {
        if (id === this.currentId) continue;
        if (oldest === null || entry.used < this.built.get(oldest)!.used) oldest = id;
      }
      if (oldest === null) return;
      this.release(oldest, this.built.get(oldest)!);
    }
  }

  private release(id: EndpointId, entry: Built): void {
    this.options.parent.remove(entry.room.object);
    entry.room.dispose();
    this.built.delete(id);
  }
}

const taskId = (id: EndpointId): string => `room:${id}`;

function mergeOptions(a: ScheduleOptions | undefined, b: ScheduleOptions): ScheduleOptions {
  if (!a) return b;
  const priority = Math.max(a.priority ?? 0, b.priority ?? 0);
  const deadlines = [a.deadline, b.deadline].filter((d): d is number => d !== undefined);
  return { priority, ...(deadlines.length ? { deadline: Math.min(...deadlines) } : {}) };
}
