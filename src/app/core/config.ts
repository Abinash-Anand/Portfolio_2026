import { InjectionToken } from '@angular/core';

/**
 * Public origin of the site, used for canonical URLs and Open Graph tags.
 * Defaults to the current production host (checked live on 2026-10-01); confirm before launch (Phase 5).
 */
export const SITE_URL = new InjectionToken<string>('SITE_URL', {
  providedIn: 'root',
  factory: () => 'https://abinashanand.vercel.app',
});

export const SITE_NAME = 'Abinash Anand';
