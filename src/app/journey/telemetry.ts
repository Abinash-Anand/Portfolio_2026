import type { EndpointId } from '../core/experience';

/**
 * The request monitor shown during a journey. There is NO backend: everything here is theatre, and the
 * HUD says so (CONCEPT.md A3). Never present these numbers as measurements.
 */
export const SIMULATED_TAG = 'SIMULATED';

export function requestLines(endpoint: EndpointId): readonly string[] {
  return [
    '>>> OUTBOUND REQUEST INITIALIZED',
    '>>> PROTOCOL: HTTPS/2 | TLS 1.3',
    '>>> METHOD: GET',
    `>>> TARGET: api.abinash.dev/v1/${endpoint}`,
    '>>> RTT TIMER: 2ms... 8ms... 14ms...',
  ];
}

/** The line shown when the packet returns with the response. */
export const RESPONSE_LINE = 'STATUS 200 OK | PAYLOAD SIZE: 2.4KB | TIME: 24ms';

/** The boot prompt (CONCEPT.md Prologue). Real DOM text, so it is readable before any 3D loads. */
export const BOOT_LINES: readonly string[] = [
  'SYSTEM STATUS: ONLINE',
  'TARGET NODE: STUTTGART_COMPUTE_CORE // HOST: ABINASH_ANAND',
  'ACTION REQUIRED: INITIALIZE NEURAL LINK TO ENTER DIGITAL SUBSTRATUM',
];

/** Fixed theatre, deliberately not the visitor's real IP or location (CONCEPT.md A3, privacy). */
export const IDENTITY_LINE = 'IP: 127.0.0.1 | LOCATION: STUTTGART, GERMANY';

export const CONSOLE_PROMPT = 'Select a payload endpoint to execute request.';
