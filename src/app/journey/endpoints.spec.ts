import { ENDPOINT_IDS } from '../core/experience';
import { ENDPOINTS, endpointInfo, keycapLabel, nextEndpoint } from './endpoints';
import { BOOT_LINES, IDENTITY_LINE, requestLines, RESPONSE_LINE, SIMULATED_TAG } from './telemetry';

describe('endpoints', () => {
  it('lists the five endpoints in console order, one entry per id', () => {
    expect(ENDPOINTS.map((e) => e.id)).toEqual([...ENDPOINT_IDS]);
  });

  it('formats keycaps exactly as in the concept', () => {
    expect(keycapLabel(endpointInfo('about'))).toBe('[ GET /api/v1/about ]');
    expect(keycapLabel(endpointInfo('experience'))).toBe('[ GET /api/v1/experience ]');
  });

  it('has a 2D route for every endpoint (3D/2D parity)', () => {
    for (const endpoint of ENDPOINTS) expect(endpoint.route).toMatch(/^\/[a-z]+$/);
  });

  it('wraps "next" around the end', () => {
    expect(nextEndpoint('about')).toBe('education');
    expect(nextEndpoint('experience')).toBe('about');
  });

  it('rejects unknown ids', () => {
    expect(() => endpointInfo('nope' as never)).toThrow();
  });
});

describe('telemetry (simulated)', () => {
  it('targets the requested endpoint and uses the concept wording', () => {
    const lines = requestLines('skills');
    expect(lines[0]).toBe('>>> OUTBOUND REQUEST INITIALIZED');
    expect(lines).toContain('>>> TARGET: api.abinash.dev/v1/skills');
    expect(RESPONSE_LINE).toBe('STATUS 200 OK | PAYLOAD SIZE: 2.4KB | TIME: 24ms');
  });

  it('is labelled as simulated, and never claims a real IP or location', () => {
    expect(SIMULATED_TAG).toBe('SIMULATED');
    expect(IDENTITY_LINE).toContain('127.0.0.1');
  });

  it('keeps the boot prompt verbatim', () => {
    expect(BOOT_LINES).toEqual([
      'SYSTEM STATUS: ONLINE',
      'TARGET NODE: STUTTGART_COMPUTE_CORE // HOST: ABINASH_ANAND',
      'ACTION REQUIRED: INITIALIZE NEURAL LINK TO ENTER DIGITAL SUBSTRATUM',
    ]);
  });
});
