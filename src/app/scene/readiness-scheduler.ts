/**
 * The ReadinessScheduler (ARCHITECTURE.md S7, ADR-007): prepares what the visitor is about to need (a room, a
 * warm-up draw) without ever costing a frame. Work is written as generators: each `yield` marks a point where the
 * scheduler may stop and give the main thread back. Every frame the host calls `tick(budgetMs)`, which runs the
 * most important pending steps until the budget is spent.
 *
 * Idle time is not guaranteed (slow devices, busy pages), so every task can carry a deadline: past it, the task
 * is finished at once, whatever the budget. Pure TypeScript with an injectable clock, so it is unit-tested.
 */

/** A task's steps. Run it as a generator function: `function* () { stepOne(); yield; stepTwo(); }`. */
export type TaskSteps = Generator<void, void, void>;

/** Higher runs first. Equal priorities run in the order they were scheduled. */
export const PRIORITY = {
  /** Nobody asked for it yet; do it when there is time. */
  background: 0,
  /** Likely needed soon (the next room in the order). */
  prefetch: 10,
  /** The visitor showed intent (hovered a key). */
  intent: 20,
  /** Needed now. */
  urgent: 30,
} as const;

export interface ScheduleOptions {
  readonly priority?: number;
  /** Absolute time (same clock as the scheduler) by which the task must be complete. */
  readonly deadline?: number;
}

interface Task {
  readonly id: string;
  readonly order: number;
  readonly steps: TaskSteps;
  readonly promise: Promise<void>;
  readonly resolve: () => void;
  readonly reject: (error: unknown) => void;
  priority: number;
  deadline: number | null;
}

export class ReadinessScheduler {
  private readonly tasks = new Map<string, Task>();
  private nextOrder = 0;

  constructor(private readonly clock: () => number = () => performance.now()) {}

  /** Number of tasks that have not finished. */
  get pending(): number {
    return this.tasks.size;
  }

  has(id: string): boolean {
    return this.tasks.has(id);
  }

  /** Ids of the tasks still pending, most important first. */
  pendingIds(): string[] {
    return [...this.tasks.values()]
      .sort((a, b) => b.priority - a.priority || a.order - b.order)
      .map((task) => task.id);
  }

  /**
   * Schedules a task. Scheduling an id that is already pending does not duplicate it: it raises the priority and
   * tightens the deadline if the new ones are more urgent, and returns the same promise.
   */
  schedule(id: string, steps: () => TaskSteps, options: ScheduleOptions = {}): Promise<void> {
    const existing = this.tasks.get(id);
    if (existing) {
      this.raise(existing, options);
      return existing.promise;
    }
    let resolve!: () => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<void>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    this.tasks.set(id, {
      id,
      order: this.nextOrder++,
      steps: steps(),
      promise,
      resolve,
      reject,
      priority: options.priority ?? PRIORITY.background,
      deadline: options.deadline ?? null,
    });
    return promise;
  }

  /** The visitor's intent changed: make a pending task more urgent. Does nothing for unknown ids. */
  boost(id: string, options: ScheduleOptions): void {
    const task = this.tasks.get(id);
    if (task) this.raise(task, options);
  }

  /** Drops a pending task. Its promise never settles; callers that cancel must not wait on it. */
  cancel(id: string): void {
    this.tasks.delete(id);
  }

  cancelAll(): void {
    this.tasks.clear();
  }

  /** Finishes a task right now, ignoring the budget (the visitor needs it this instant). */
  flush(id: string): void {
    const task = this.tasks.get(id);
    if (task) this.runToCompletion(task);
  }

  /**
   * Runs pending work for at most about `budgetMs`. Tasks past their deadline are finished first, in full.
   * At least one step runs when anything is pending, so a step longer than the budget cannot starve the queue.
   * Returns how many steps ran.
   */
  tick(budgetMs: number): number {
    const started = this.clock();
    let steps = 0;

    for (const task of [...this.tasks.values()]) {
      if (task.deadline !== null && started >= task.deadline && this.tasks.has(task.id)) {
        steps += this.runToCompletion(task);
      }
    }

    while (this.tasks.size > 0) {
      const task = this.mostImportant();
      if (!task) break;
      this.step(task);
      steps++;
      if (this.clock() - started >= budgetMs) break;
    }
    return steps;
  }

  private raise(task: Task, options: ScheduleOptions): void {
    if (options.priority !== undefined && options.priority > task.priority) {
      task.priority = options.priority;
    }
    if (
      options.deadline !== undefined &&
      (task.deadline === null || options.deadline < task.deadline)
    ) {
      task.deadline = options.deadline;
    }
  }

  private mostImportant(): Task | undefined {
    let best: Task | undefined;
    for (const task of this.tasks.values()) {
      if (
        !best ||
        task.priority > best.priority ||
        (task.priority === best.priority && task.order < best.order)
      ) {
        best = task;
      }
    }
    return best;
  }

  /** Runs one step; settles and removes the task when it finishes or fails. Returns false once finished. */
  private step(task: Task): boolean {
    try {
      const result = task.steps.next();
      if (result.done) {
        this.tasks.delete(task.id);
        task.resolve();
        return false;
      }
      return true;
    } catch (error) {
      this.tasks.delete(task.id);
      task.reject(error);
      return false;
    }
  }

  private runToCompletion(task: Task): number {
    let steps = 0;
    do {
      steps++;
    } while (this.step(task));
    return steps;
  }
}
