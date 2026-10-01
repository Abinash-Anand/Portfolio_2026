import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AA_GRAPHICS, AA_TEXT, contrastRatio } from '../../core/design/contrast';
import { COLORS, MOTION, SEMANTICS, TEXT_SAFE, type ColorToken } from '../../core/design/tokens';
import { SeoService } from '../../core/seo.service';
import { MotionService } from '../../motion/motion.service';
import { TIER_PROFILES, TIERS } from '../../motion/tier';
import { ENDPOINTS } from '../../journey/endpoints';
import { BOOT_LINES } from '../../journey/telemetry';
import { EndpointKeys } from '../journey/hud/endpoint-keys.component';
import { TelemetryMonitor } from '../journey/hud/telemetry-monitor.component';
import { Typewriter } from '../journey/hud/typewriter.component';

interface Swatch {
  readonly token: ColorToken;
  readonly hex: string;
  readonly role: 'text' | 'graphics' | 'surface';
  readonly onVoid: number;
  readonly onSurface: number;
  /** Meets the bar for its role (AA text, or 3:1 for graphics). */
  readonly passes: boolean;
}

function roleOf(token: ColorToken): Swatch['role'] {
  if (token === 'void' || token === 'surface' || token === 'raised') return 'surface';
  return (TEXT_SAFE as readonly string[]).includes(token) ? 'text' : 'graphics';
}

/**
 * Living styleguide (DESIGN.md section 15, ARCHITECTURE.md ADR-013): the design tokens, the HUD building blocks in
 * every state, motion and tiers, rendered by the real app. Internal route, not indexed. Contrast ratios are computed
 * here from the same tokens the app uses, so the page cannot disagree with the code.
 */
@Component({
  selector: 'app-styleguide-page',
  imports: [DecimalPipe, EndpointKeys, TelemetryMonitor, Typewriter],
  templateUrl: './styleguide.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StyleguidePage {
  protected readonly motion = inject(MotionService);

  protected readonly swatches: readonly Swatch[] = (Object.keys(COLORS) as ColorToken[]).map(
    (token) => {
      const hex = COLORS[token];
      const role = roleOf(token);
      const onVoid = contrastRatio(hex, COLORS.void);
      const onSurface = contrastRatio(hex, COLORS.surface);
      const passes =
        role === 'surface'
          ? true
          : role === 'text'
            ? Math.min(onVoid, onSurface) >= AA_TEXT
            : onVoid >= AA_GRAPHICS;
      return { token, hex, role, onVoid, onSurface, passes };
    },
  );

  protected readonly semantics = Object.entries(SEMANTICS);
  protected readonly colors = COLORS;
  protected readonly motionTokens = MOTION;
  protected readonly durations = Object.entries(MOTION.durations);
  protected readonly easings = Object.entries(MOTION.easings);
  protected readonly tiers = TIERS.map((tier) => ({
    tier,
    profile: tier === 'static' ? null : TIER_PROFILES[tier],
  }));
  protected readonly endpoints = ENDPOINTS;
  protected readonly bootLines = BOOT_LINES.slice(0, 2);

  constructor() {
    inject(SeoService).set({
      title: 'Styleguide — Abinash Anand',
      description: 'Internal design system reference.',
      path: '/styleguide',
      robots: 'noindex, nofollow',
    });
  }
}
