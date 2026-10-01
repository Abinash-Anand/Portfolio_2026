/**
 * What the device and user preferences allow. Probed once, lazily, only when the experience mounts.
 * Raw values stay in the browser; only the derived tier is ever reported.
 */
export interface Capabilities {
  readonly reducedMotion: boolean;
  readonly webgl2: boolean;
  readonly hardwareConcurrency: number | null;
  readonly deviceMemoryGb: number | null;
  readonly coarsePointer: boolean;
  readonly saveData: boolean;
}

/** The slice of `window` the probe needs, so it can be tested without a browser. */
export interface ProbeEnvironment {
  matchMedia?: (query: string) => { matches: boolean };
  navigator?: {
    hardwareConcurrency?: number;
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  createCanvas?: () => { getContext(id: string): unknown };
}

const STATIC_FALLBACK: Capabilities = {
  reducedMotion: true,
  webgl2: false,
  hardwareConcurrency: null,
  deviceMemoryGb: null,
  coarsePointer: false,
  saveData: false,
};

function supportsWebGl2(createCanvas: ProbeEnvironment['createCanvas']): boolean {
  if (!createCanvas) return false;
  try {
    const context = createCanvas().getContext('webgl2') as {
      getExtension(name: string): { loseContext(): void } | null;
    } | null;
    // Release the probe context immediately; browsers cap the number of live contexts.
    context?.getExtension('WEBGL_lose_context')?.loseContext();
    return !!context;
  } catch {
    return false;
  }
}

export function probeCapabilities(env: ProbeEnvironment | null): Capabilities {
  if (!env) return STATIC_FALLBACK;
  const match = (query: string): boolean => env.matchMedia?.(query).matches ?? false;
  const nav = env.navigator;
  return {
    reducedMotion: match('(prefers-reduced-motion: reduce)'),
    webgl2: supportsWebGl2(env.createCanvas),
    hardwareConcurrency: nav?.hardwareConcurrency ?? null,
    deviceMemoryGb: nav?.deviceMemory ?? null,
    coarsePointer: match('(pointer: coarse)'),
    saveData: nav?.connection?.saveData === true,
  };
}
