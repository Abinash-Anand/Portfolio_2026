import { GpuTimer, type TimerContext } from './gpu-timer';

const TIME_ELAPSED = 0x88bf;
const DISJOINT = 0x8fbb;

/** A fake WebGL2 timer-query context where you decide which queries have finished, and with what result. */
class FakeContext implements TimerContext {
  readonly QUERY_RESULT_AVAILABLE = 1;
  readonly QUERY_RESULT = 2;
  supported = true;
  disjoint = false;
  created = 0;
  deleted = 0;
  open: object | null = null;
  readonly finished = new Map<object, number>(); // query -> nanoseconds

  getExtension(name: string): unknown {
    return this.supported && name === 'EXT_disjoint_timer_query_webgl2'
      ? { TIME_ELAPSED_EXT: TIME_ELAPSED, GPU_DISJOINT_EXT: DISJOINT }
      : null;
  }
  getParameter(pname: number): unknown {
    return pname === DISJOINT ? this.disjoint : null;
  }
  createQuery(): WebGLQuery {
    this.created++;
    return {} as WebGLQuery;
  }
  deleteQuery(): void {
    this.deleted++;
  }
  beginQuery(_target: number, query: WebGLQuery): void {
    this.open = query;
  }
  endQuery(): void {
    this.open = null;
  }
  getQueryParameter(query: WebGLQuery, pname: number): unknown {
    return pname === this.QUERY_RESULT_AVAILABLE
      ? this.finished.has(query)
      : this.finished.get(query);
  }
}

describe('GpuTimer', () => {
  it('is unavailable when the browser hides timer queries', () => {
    const gl = new FakeContext();
    gl.supported = false;
    expect(GpuTimer.create(gl)).toBeNull();
  });

  it('reports a finished frame in milliseconds, and nothing while the GPU is still working', () => {
    const gl = new FakeContext();
    const timer = GpuTimer.create(gl)!;
    timer.begin();
    const query = gl.open!;
    timer.end();

    expect(timer.poll()).toEqual([]); // not finished yet
    gl.finished.set(query, 2_500_000);
    expect(timer.poll()).toEqual([2.5]);
    expect(timer.poll()).toEqual([]); // reported once
  });

  it('discards results after a disjoint event, because they are meaningless', () => {
    const gl = new FakeContext();
    const timer = GpuTimer.create(gl)!;
    timer.begin();
    const query = gl.open!;
    timer.end();
    gl.finished.set(query, 9_000_000);
    gl.disjoint = true;
    expect(timer.poll()).toEqual([]);
  });

  it('reuses query objects and caps how many are in flight', () => {
    const gl = new FakeContext();
    const timer = GpuTimer.create(gl)!;
    for (let i = 0; i < 20; i++) {
      timer.begin();
      timer.end();
    }
    expect(gl.created).toBe(8); // never more than the in-flight cap, however slow the GPU is
  });

  it('recycles a finished query instead of creating a new one', () => {
    const gl = new FakeContext();
    const timer = GpuTimer.create(gl)!;
    timer.begin();
    const query = gl.open!;
    timer.end();
    gl.finished.set(query, 1_000_000);
    timer.poll();
    timer.begin();
    timer.end();
    expect(gl.created).toBe(1);
  });

  it('ignores an end without a begin, and deletes every query on dispose', () => {
    const gl = new FakeContext();
    const timer = GpuTimer.create(gl)!;
    timer.end(); // no-op
    timer.begin();
    timer.end();
    timer.begin(); // second query, still pending the first
    timer.dispose();
    expect(gl.deleted).toBe(gl.created);
  });
});
