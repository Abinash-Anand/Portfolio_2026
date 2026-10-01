import { Group } from 'three';
import type { EndpointId } from '../../core/experience';
import { PRIORITY, ReadinessScheduler } from '../readiness-scheduler';
import { EMPTY_CONTENT } from '../scene-host';
import { THREE_PROFILES } from './profiles';
import type { RoomContext, RoomLoader } from './room';
import { RoomManager } from './room-manager';
import { fakeLoaders, FakeRoom, macrotask } from './testing';

const context: RoomContext = {
  content: EMPTY_CONTENT,
  profile: THREE_PROFILES.high,
  random: () => 0.5,
};

function setup() {
  const scheduler = new ReadinessScheduler(() => 0);
  const parent = new Group();
  const fakes = fakeLoaders();
  const built: FakeRoom[] = [];
  const manager = new RoomManager({
    parent,
    loaders: fakes.loaders,
    scheduler,
    context: () => context,
    onBuilt: (room) => built.push(room as FakeRoom),
  });
  /** Lets code loading settle, then runs the scheduler like a frame would. */
  const settle = async (): Promise<void> => {
    await macrotask();
    scheduler.tick(1000);
    await macrotask();
  };
  /** Prepares a room and waits until it is built. */
  const build = async (id: EndpointId): Promise<void> => {
    void manager.prepare(id);
    await settle();
  };
  return { manager, scheduler, parent, fakes, built, settle, build };
}

describe('RoomManager', () => {
  it('loads the code of a room only when it is asked for, and builds it through the scheduler', async () => {
    const { manager, scheduler, fakes, parent, settle, built } = setup();
    expect(fakes.loads).toEqual([]);

    const promise = manager.prepare('skills', { priority: PRIORITY.intent });
    await settle();

    const room = await promise;
    expect(fakes.loads).toEqual(['skills']);
    expect(room?.id).toBe('skills');
    expect(parent.children).toContain(room!.object);
    expect(room!.object.visible).toBe(false); // built hidden: nobody is in it yet
    expect(built).toEqual([room]);
    expect(scheduler.pending).toBe(0);
    expect(manager.buildMs.has('skills')).toBe(true);
  });

  it('does not build a room twice, and speeds up the work already underway when asked again', async () => {
    const { manager, scheduler, fakes, settle } = setup();
    const first = manager.prepare('about', { priority: PRIORITY.background });
    const again = manager.prepare('about', { priority: PRIORITY.urgent });
    expect(again).toBe(first);

    await settle();
    await first;
    expect(fakes.loads).toEqual(['about']);
    expect(fakes.rooms).toHaveLength(1);
    expect(scheduler.pending).toBe(0);

    await expect(manager.prepare('about')).resolves.toBe(manager.get('about'));
    expect(fakes.loads).toEqual(['about']);
  });

  it('shows one room at a time, hiding the previous one', async () => {
    const { manager, build } = setup();
    await build('about');
    await build('education');

    expect(manager.show('about')).not.toBeNull();
    expect(manager.current?.id).toBe('about');
    manager.show('education');
    expect(manager.current?.id).toBe('education');
    expect((manager.get('about') as FakeRoom).shown).toBe(false);
    expect((manager.get('education') as FakeRoom).shown).toBe(true);

    manager.hide();
    expect(manager.current).toBeNull();
    expect((manager.get('education') as FakeRoom).shown).toBe(false);
  });

  it('cannot show a room that has not been built, and says so', () => {
    const { manager } = setup();
    expect(manager.show('projects')).toBeNull();
    expect(manager.current).toBeNull();
  });

  it('keeps at most two rooms alive and releases the least recently used one', async () => {
    const { manager, parent, build } = setup();
    for (const id of ['about', 'education', 'skills'] as const) {
      await build(id);
      manager.show(id);
    }

    expect(manager.ids).toHaveLength(2);
    expect(manager.ids).toEqual(expect.arrayContaining(['education', 'skills']));
    expect(manager.get('about')).toBeUndefined(); // the oldest went first
    expect(parent.children).toHaveLength(2);
  });

  it('never releases the room the visitor is in, however many others are prepared', async () => {
    const { manager, build } = setup();
    await build('about');
    manager.show('about');

    for (const id of ['education', 'skills', 'projects'] as const) await build(id);

    expect(manager.current?.id).toBe('about');
    expect(manager.get('about')).toBeDefined();
    expect(manager.ids).toHaveLength(2);
  });

  it('disposes a released room completely and takes it out of the scene', async () => {
    const { manager, parent, fakes, build } = setup();
    for (const id of ['about', 'education', 'skills'] as const) {
      await build(id);
      manager.show(id);
    }
    const gone = fakes.roomOf('about')!;
    expect(gone.disposed).toBe(1);
    expect(parent.children).not.toContain(gone.object);
  });

  it('throws everything away when the content changes, and drops builds that were in flight', async () => {
    const { manager, parent, fakes, build, settle } = setup();
    await build('about');
    manager.show('about');
    void manager.prepare('skills'); // still loading when the content changes

    manager.invalidate();
    await settle();

    expect(manager.current).toBeNull();
    expect(manager.ids).toEqual([]);
    expect(parent.children).toHaveLength(0);
    expect(fakes.rooms.every((room) => room.disposed === 1)).toBe(true);
    expect(manager.show('about')).toBeNull();

    // And it can build again afterwards.
    await build('about');
    expect(manager.show('about')).not.toBeNull();
  });

  it('records a room whose construction fails instead of throwing, so the page keeps working', async () => {
    const { manager, fakes, settle } = setup();
    fakes.override('projects', () =>
      Promise.resolve(() => {
        throw new Error('construction failed');
      }),
    );
    const result = manager.prepare('projects');
    await settle();

    await expect(result).resolves.toBeNull();
    expect(manager.failed.has('projects')).toBe(true);
    expect(fakes.loads).toEqual(['projects']);
    expect(manager.show('projects')).toBeNull();
  });

  it('reports a failure to load the code (for example offline) the same way, and can retry', async () => {
    const { manager, fakes, settle } = setup();
    fakes.override('about', () => Promise.reject(new Error('chunk failed')));

    await expect(manager.prepare('about')).resolves.toBeNull();
    expect(manager.failed.has('about')).toBe(true);

    const working: RoomLoader = () => Promise.resolve(() => new FakeRoom('about'));
    fakes.override('about', working);
    const retry = manager.prepare('about');
    await settle();
    await expect(retry).resolves.not.toBeNull();
    expect(manager.failed.has('about')).toBe(false);
  });

  it('waits for the label font before building, when asked to', async () => {
    const scheduler = new ReadinessScheduler(() => 0);
    const fakes = fakeLoaders();
    let releaseFont: () => void = () => undefined;
    const font = new Promise<void>((resolve) => (releaseFont = resolve));
    const manager = new RoomManager({
      parent: new Group(),
      scheduler,
      loaders: fakes.loaders,
      context: () => context,
      ready: () => font,
    });

    const pending = manager.prepare('about');
    await macrotask();
    scheduler.tick(1000);
    expect(scheduler.pending).toBe(0); // nothing was scheduled: still waiting for the font
    expect(fakes.rooms).toHaveLength(0);

    releaseFont();
    await macrotask();
    scheduler.tick(1000);
    await expect(pending).resolves.not.toBeNull();
  });
});
