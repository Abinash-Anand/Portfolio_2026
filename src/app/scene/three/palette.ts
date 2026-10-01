import { Color } from 'three';
import { COLORS, type ColorToken } from '../../core/design/tokens';

const cache = new Map<ColorToken, Color>();

/**
 * A design-token color as a Three.js Color (the colors come from core/design/tokens.ts, never raw hex).
 * The returned instance is shared: clone it before mutating.
 */
export function tokenColor(token: ColorToken): Color {
  let color = cache.get(token);
  if (!color) {
    color = new Color(COLORS[token]);
    cache.set(token, color);
  }
  return color;
}
