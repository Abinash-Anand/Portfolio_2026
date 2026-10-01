import { isPlatformBrowser } from '@angular/common';
import { effect, inject, Injectable, PLATFORM_ID, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { ENDPOINT_IDS, type EndpointId } from '../../core/experience';
import { JourneyService } from '../../journey/journey.service';

/** `skills` becomes the endpoint, anything else (a typo in the address bar) becomes null. */
export function parseEndpoint(raw: string | undefined | null): EndpointId | null {
  return ENDPOINT_IDS.find((id) => id === raw) ?? null;
}

/**
 * Keeps the address bar and the journey in step (CONCEPT.md A6): every room has a URL (`/journey/skills`), the back
 * and forward buttons move between rooms and the console, and a link opens straight into a room.
 *
 * The journey state is the driver while the visitor acts (arriving in a room pushes its URL, so Back returns to
 * where they were); the URL is the driver when the browser does (Back, Forward, a pasted link). The URL only
 * ever names SETTLED places, so a journey in progress never writes history.
 *
 * Provide it on the page, and call `connect` once from the page's constructor (it needs the injection context).
 */
@Injectable()
export class JourneyUrlSync {
  private readonly router = inject(Router);
  private readonly journey = inject(JourneyService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  /** `param` reads the route's `endpoint` parameter (the page's component input). */
  connect(param: () => string | undefined): void {
    // The URL changed: Back, Forward, a link, or our own navigation arriving.
    effect(() => {
      const raw = param();
      untracked(() => this.fromUrl(raw));
    });

    // The journey changed: write the new settled place to the URL.
    effect(() => {
      const kind = this.journey.kind();
      const endpoint = this.journey.endpoint();
      untracked(() => this.toUrl(kind, endpoint, param()));
    });
  }

  private fromUrl(raw: string | undefined): void {
    const endpoint = parseEndpoint(raw);
    if (raw !== undefined && endpoint === null) {
      // `/journey/nonsense`: the console is the honest answer.
      this.navigate(['/journey'], true);
      return;
    }

    const state = this.journey.state();
    if (state.kind === 'standard2d') return;
    if (endpoint) {
      const already =
        (state.kind === 'room' || state.kind === 'journey') && state.endpoint === endpoint;
      if (!already) this.journey.open(endpoint);
    } else if (state.kind === 'room') {
      this.journey.leave(); // Back out of a room
    }
  }

  private toUrl(kind: string, endpoint: EndpointId | null, current: string | undefined): void {
    if (kind === 'room' && endpoint && current !== endpoint) {
      this.navigate(['/journey', endpoint], false);
    } else if (kind === 'console' && current !== undefined) {
      this.navigate(['/journey'], false);
    }
  }

  private navigate(commands: string[], replaceUrl: boolean): void {
    if (this.browser) void this.router.navigate(commands, { replaceUrl });
  }
}
