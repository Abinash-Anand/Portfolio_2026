import { PRIORITY, ReadinessScheduler, type TaskSteps } from './readiness-scheduler';

/** A task of `count` steps that records each step in `log` as `name:index`. */
const task = (log: string[], name: string, count: number) =>
  function* (): TaskSteps {
    for (let i = 0; i < count; i++) {
      log.push(`${name}:${i}`);
      if (i < count - 1) yield;
    }
  };

/** A clock you advance by hand; `cost` is how much time each step "takes". */
function setup(cost = 0) {
  let now = 0;
  const scheduler = new ReadinessScheduler(() => now);
  const wrap = (steps: () => TaskSteps) =>
    function* (): TaskSteps {
      const inner = steps();
      for (let result = inner.next(); !result.done; result = inner.next()) {
        now += cost;
        yield;
      }
      now += cost;
    };
  return { scheduler, wrap, advance: (ms: number) => (now += ms), now: () => now };
}

describe('ReadinessScheduler', () => {
  it('runs the most important task first, and equals in the order they were scheduled', () => {
    const { scheduler } = setup();
    const log: string[] = [];
    void scheduler.schedule('a', task(log, 'a', 1), { priority: PRIORITY.background });
    void scheduler.schedule('b', task(log, 'b', 1), { priority: PRIORITY.urgent });
    void scheduler.schedule('c', task(log, 'c', 1), { priority: PRIORITY.urgent });
    scheduler.tick(1000);
    expect(log).toEqual(['b:0', 'c:0', 'a:0']);
  });

  it('stops when the frame budget is spent, and carries on next frame', () => {
    const { scheduler, wrap } = setup(2); // every step takes 2 ms
    const log: string[] = [];
    void scheduler.schedule('a', wrap(task(log, 'a', 6)));

    const firstFrame = scheduler.tick(4);
    expect(firstFrame).toBe(2); // 2 steps x 2 ms reaches the 4 ms budget
    expect(scheduler.pending).toBe(1);

    scheduler.tick(4);
    scheduler.tick(4);
    expect(log).toHaveLength(6);
    expect(scheduler.pending).toBe(0);
  });

  it('always runs at least one step, so a step longer than the budget cannot starve the queue', () => {
    const { scheduler, wrap } = setup(50);
    const log: string[] = [];
    void scheduler.schedule('slow', wrap(task(log, 'slow', 3)));
    expect(scheduler.tick(4)).toBe(1);
    expect(log).toEqual(['slow:0']);
  });

  it('finishes a task in full once its deadline has passed, whatever the budget', () => {
    const { scheduler, advance } = setup();
    const log: string[] = [];
    void scheduler.schedule('late', task(log, 'late', 5), { deadline: 100 });

    scheduler.tick(0);
    expect(log).toHaveLength(1); // before the deadline: one step per frame

    advance(150);
    scheduler.tick(0);
    expect(log).toHaveLength(5);
    expect(scheduler.pending).toBe(0);
  });

  it('does not duplicate a pending task: scheduling it again only makes it more urgent', async () => {
    const { scheduler } = setup();
    const log: string[] = [];
    const first = scheduler.schedule('room', task(log, 'room', 2), { priority: PRIORITY.prefetch });
    void scheduler.schedule('other', task(log, 'other', 1), { priority: PRIORITY.intent });
    const second = scheduler.schedule('room', task(log, 'DUPLICATE', 2), {
      priority: PRIORITY.urgent,
    });

    expect(second).toBe(first);
    expect(scheduler.pending).toBe(2);
    scheduler.tick(1000);
    expect(log).toEqual(['room:0', 'room:1', 'other:0']); // boosted above the intent task
    await expect(first).resolves.toBeUndefined();
  });

  it('never lowers a priority or loosens a deadline', () => {
    const { scheduler, advance } = setup();
    const log: string[] = [];
    void scheduler.schedule('a', task(log, 'a', 3), { priority: PRIORITY.urgent, deadline: 50 });
    void scheduler.schedule('a', task(log, 'a', 3), {
      priority: PRIORITY.background,
      deadline: 500,
    });
    void scheduler.schedule('b', task(log, 'b', 1), { priority: PRIORITY.intent });

    advance(60);
    scheduler.tick(0);
    expect(log).toEqual(['a:0', 'a:1', 'a:2', 'b:0']); // `a` kept its deadline of 50 and priority
  });

  it('can boost, cancel and flush by id, and ignores unknown ids', async () => {
    const { scheduler } = setup();
    const log: string[] = [];
    void scheduler.schedule('a', task(log, 'a', 1), { priority: PRIORITY.background });
    const b = scheduler.schedule('b', task(log, 'b', 3), { priority: PRIORITY.background });
    void scheduler.schedule('c', task(log, 'c', 1), { priority: PRIORITY.background });

    scheduler.boost('c', { priority: PRIORITY.urgent });
    scheduler.boost('nope', { priority: PRIORITY.urgent });
    scheduler.cancel('a');
    scheduler.cancel('nope');
    scheduler.flush('b');
    scheduler.flush('nope');
    await expect(b).resolves.toBeUndefined();
    scheduler.tick(1000);

    expect(log).toEqual(['b:0', 'b:1', 'b:2', 'c:0']);
    expect(scheduler.has('a')).toBe(false);
  });

  it('rejects the promise of a task that throws and keeps running the others', async () => {
    const { scheduler } = setup();
    const log: string[] = [];
    const failing = scheduler.schedule(
      'bad',
      function* (): TaskSteps {
        yield;
        throw new Error('boom');
      },
      { priority: PRIORITY.urgent },
    );
    const caught = failing.catch((error: Error) => error.message);
    void scheduler.schedule('good', task(log, 'good', 1));

    scheduler.tick(1000);

    await expect(caught).resolves.toBe('boom');
    expect(log).toEqual(['good:0']);
    expect(scheduler.pending).toBe(0);
  });

  it('lists what is pending, most important first', () => {
    const { scheduler } = setup();
    void scheduler.schedule('a', task([], 'a', 1), { priority: PRIORITY.background });
    void scheduler.schedule('b', task([], 'b', 1), { priority: PRIORITY.urgent });
    void scheduler.schedule('c', task([], 'c', 1), { priority: PRIORITY.background });
    expect(scheduler.pendingIds()).toEqual(['b', 'a', 'c']);
  });

  it('can be cleared, and does nothing when empty', () => {
    const { scheduler } = setup();
    expect(scheduler.tick(10)).toBe(0);
    void scheduler.schedule('a', task([], 'a', 2));
    scheduler.cancelAll();
    expect(scheduler.pending).toBe(0);
    expect(scheduler.tick(10)).toBe(0);
  });
});
