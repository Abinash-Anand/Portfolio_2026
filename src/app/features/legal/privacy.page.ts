import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LEGAL } from '../../content/legal';
import { PROFILE } from '../../content/profile';
import { SeoService } from '../../core/seo.service';

/** The privacy notice. States exactly what this site does and does not collect (PRODUCT.md section 3). */
@Component({
  selector: 'app-privacy-page',
  imports: [RouterLink],
  templateUrl: './privacy.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyPage {
  protected readonly profile = PROFILE;
  protected readonly legal = LEGAL;

  constructor() {
    inject(SeoService).set({
      title: `Privacy — ${PROFILE.name}`,
      description:
        'What data this website collects, and what it does not: no cookies, no tracking across sites, no profiles.',
      path: '/privacy',
    });
  }
}
