import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LEGAL } from '../../content/legal';
import { PROFILE } from '../../content/profile';
import { SeoService } from '../../core/seo.service';

/** The legal notice (Impressum). The postal address comes from `content/legal.ts`. */
@Component({
  selector: 'app-impressum-page',
  imports: [RouterLink],
  templateUrl: './impressum.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImpressumPage {
  protected readonly profile = PROFILE;
  protected readonly legal = LEGAL;

  constructor() {
    inject(SeoService).set({
      title: `Impressum — ${PROFILE.name}`,
      description: `Legal notice (Impressum) of the website of ${PROFILE.name}.`,
      path: '/impressum',
      robots: 'noindex, follow',
    });
  }
}
