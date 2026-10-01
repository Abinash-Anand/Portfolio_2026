/**
 * GPU frame time from `EXT_disjoint_timer_query_webgl2`. Browsers expose it unevenly (some hide it for privacy),
 * so everything here degrades to "unknown" instead of failing. Results arrive a frame or two late, which is fine
 * for averages. Only enabled when measuring (the dev overlay and the Spike 0 benchmark), never by default.
 */

interface TimerExtension {
  readonly TIME_ELAPSED_EXT: number;
  readonly GPU_DISJOINT_EXT: number;
}

/** The slice of WebGL2 this class needs, so it can be tested with a fake. */
export interface TimerContext {
  getExtension(name: string): unknown;
  getParameter(pname: number): unknown;
  createQuery(): WebGLQuery | null;
  deleteQuery(query: WebGLQuery | null): void;
  beginQuery(target: number, query: WebGLQuery): void;
  endQuery(target: number): void;
  getQueryParameter(query: WebGLQuery, pname: number): unknown;
  readonly QUERY_RESULT_AVAILABLE: number;
  readonly QUERY_RESULT: number;
}

/** A frame can only have one open query; a few in flight is plenty. */
const MAX_IN_FLIGHT = 8;

export class GpuTimer {
  private readonly pending: WebGLQuery[] = [];
  private readonly pool: WebGLQuery[] = [];
  private active: WebGLQuery | null = null;

  private constructor(
    private readonly gl: TimerContext,
    private readonly ext: TimerExtension,
  ) {}

  /** Returns a timer, or null when the browser does not expose timer queries. */
  static create(gl: TimerContext): GpuTimer | null {
    const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2') as TimerExtension | null;
    return ext ? new GpuTimer(gl, ext) : null;
  }

  begin(): void {
    if (this.active || this.pending.length >= MAX_IN_FLIGHT) return;
    const query = this.pool.pop() ?? this.gl.createQuery();
    if (!query) return;
    this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, query);
    this.active = query;
  }

  end(): void {
    if (!this.active) return;
    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
    this.pending.push(this.active);
    this.active = null;
  }

  /** Completed measurements since the last call, in milliseconds. */
  poll(): number[] {
    const done: number[] = [];
    // A disjoint event (for example a power-state change) makes in-flight results meaningless.
    const disjoint = !!this.gl.getParameter(this.ext.GPU_DISJOINT_EXT);
    while (this.pending.length > 0) {
      const query = this.pending[0]!;
      if (!this.gl.getQueryParameter(query, this.gl.QUERY_RESULT_AVAILABLE)) break;
      this.pending.shift();
      if (!disjoint) {
        done.push(Number(this.gl.getQueryParameter(query, this.gl.QUERY_RESULT)) / 1e6);
      }
      this.pool.push(query);
    }
    return done;
  }

  dispose(): void {
    for (const query of [...this.pending, ...this.pool, ...(this.active ? [this.active] : [])]) {
      this.gl.deleteQuery(query);
    }
    this.pending.length = 0;
    this.pool.length = 0;
    this.active = null;
  }
}
