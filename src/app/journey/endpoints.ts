import { ENDPOINT_IDS, type EndpointId } from '../core/experience';

export interface EndpointInfo {
  readonly id: EndpointId;
  /** The request path shown on the keycap, for example `/api/v1/about`. */
  readonly path: string;
  /** One-line meaning of the endpoint (CONCEPT.md section 3). */
  readonly summary: string;
  readonly title: string;
  /** The plain 2D page with the same content (parity with the 3D room). */
  readonly route: string;
}

/** In the order of the console and of "route to next endpoint". */
export const ENDPOINTS: readonly EndpointInfo[] = [
  {
    id: 'about',
    path: '/api/v1/about',
    summary: 'Origin & Core Identity',
    title: 'About',
    route: '/about',
  },
  {
    id: 'education',
    path: '/api/v1/education',
    summary: 'HFT Stuttgart Compute Core',
    title: 'Education',
    route: '/education',
  },
  {
    id: 'skills',
    path: '/api/v1/skills',
    summary: 'Microservice Pipeline',
    title: 'Skills',
    route: '/skills',
  },
  {
    id: 'projects',
    path: '/api/v1/projects',
    summary: 'Deployed Systems (SynthGraph & ParkRabbit)',
    title: 'Projects',
    route: '/work',
  },
  {
    id: 'experience',
    path: '/api/v1/experience',
    summary: 'Git Commit Telemetry',
    title: 'Experience',
    route: '/experience',
  },
];

const BY_ID = new Map(ENDPOINTS.map((e) => [e.id, e] as const));

export function endpointInfo(id: EndpointId): EndpointInfo {
  const info = BY_ID.get(id);
  if (!info) throw new Error(`Unknown endpoint "${id}"`);
  return info;
}

/** The text on a keycap: `[ GET /api/v1/about ]`. */
export function keycapLabel(info: EndpointInfo): string {
  return `[ GET ${info.path} ]`;
}

/** The endpoint after `id`, wrapping around at the end. */
export function nextEndpoint(id: EndpointId): EndpointId {
  const index = ENDPOINT_IDS.indexOf(id);
  return ENDPOINT_IDS[(index + 1) % ENDPOINT_IDS.length] ?? 'about';
}
