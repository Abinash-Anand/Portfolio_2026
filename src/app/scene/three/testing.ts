import { Group } from 'three';
import { ENDPOINT_IDS, type EndpointId } from '../../core/experience';
import type { Pose } from './camera-rig';
import type { ThreeProfile } from './profiles';
import type { Room, RoomFactory, RoomLoader } from './room';

/** Runs after every pending promise callback, so asynchronous loading has settled. */
export const macrotask = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/** A room that records what is done to it, for testing whatever manages rooms without building real ones. */
export class FakeRoom implements Room {
  readonly object = new Group();
  shown = false;
  disposed = 0;
  focus: string | null = null;
  profile: ThreeProfile | null = null;
  pixelScale = 0;
  updates = 0;
  poseCalls = 0;
  /** What the camera is told to do while this room is shown. */
  target: Pose = { px: 0, py: 1, pz: -30, tx: 0, ty: 1, tz: -40, fov: 60 };

  constructor(readonly id: EndpointId) {
    this.object.visible = false;
  }

  pose(): Pose {
    this.poseCalls++;
    return this.target;
  }
  setProfile(profile: ThreeProfile): void {
    this.profile = profile;
  }
  setPixelScale(scale: number): void {
    this.pixelScale = scale;
  }
  setFocus(id: string | null): void {
    this.focus = id;
  }
  show(): void {
    this.shown = true;
    this.object.visible = true;
  }
  hide(): void {
    this.shown = false;
    this.object.visible = false;
  }
  update(): void {
    this.updates++;
  }
  dispose() {
    this.disposed++;
    return { geometries: 1, materials: 1, textures: 0 };
  }
}

export interface FakeLoaders {
  readonly loaders: Record<EndpointId, RoomLoader>;
  /** Every room that was built, in order. */
  readonly rooms: FakeRoom[];
  /** Every endpoint whose code was loaded, in order. */
  readonly loads: EndpointId[];
  /** Replaces what a room's loader does (to fail, or to wait). */
  readonly override: (id: EndpointId, loader: RoomLoader) => void;
  /** The built room of an endpoint, if any (the latest one). */
  readonly roomOf: (id: EndpointId) => FakeRoom | undefined;
}

/** Loaders that hand out FakeRooms. */
export function fakeLoaders(): FakeLoaders {
  const rooms: FakeRoom[] = [];
  const loads: EndpointId[] = [];
  const overrides = new Map<EndpointId, RoomLoader>();
  const factory =
    (id: EndpointId): RoomFactory =>
    () => {
      const room = new FakeRoom(id);
      rooms.push(room);
      return room;
    };
  const loaders = Object.fromEntries(
    ENDPOINT_IDS.map((id): [EndpointId, RoomLoader] => [
      id,
      () => {
        loads.push(id);
        return overrides.get(id)?.() ?? Promise.resolve(factory(id));
      },
    ]),
  ) as Record<EndpointId, RoomLoader>;
  return {
    loaders,
    rooms,
    loads,
    override: (id, loader) => overrides.set(id, loader),
    roomOf: (id) => [...rooms].reverse().find((room) => room.id === id),
  };
}
