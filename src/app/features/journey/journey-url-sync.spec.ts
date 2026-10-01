import { parseEndpoint } from './journey-url-sync';

describe('parseEndpoint', () => {
  it('accepts the five endpoints', () => {
    for (const id of ['about', 'education', 'skills', 'projects', 'experience']) {
      expect(parseEndpoint(id)).toBe(id);
    }
  });

  it('turns anything else, including a missing value, into null', () => {
    for (const bad of [
      undefined,
      null,
      '',
      'nonsense',
      'About',
      ' skills',
      'skills/',
      '../about',
    ]) {
      expect(parseEndpoint(bad)).toBeNull();
    }
  });
});
