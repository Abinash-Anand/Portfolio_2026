import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PROFILE } from '../../content/profile';
import { RESUME } from '../../content/resume';
import { SITE_URL } from '../../core/config';
import { SeoService } from '../../core/seo.service';
import { personJsonLd } from '../../core/structured-data';
import { PortfolioStore } from '../../data/portfolio.store';
import { TrackDirective } from '../../shared/directives/track.directive';
import { ActivityGraph } from './activity-graph.component';
import { ProjectCard } from '../../shared/ui/project-card.component';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, ProjectCard, ActivityGraph, TrackDirective],
  templateUrl: './home.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  protected readonly profile = PROFILE;
  private readonly store = inject(PortfolioStore);
  protected readonly activity = this.store.activity;
  protected readonly featured = computed(() => this.store.featured().slice(0, 3));

  constructor() {
    inject(SeoService).set({
      title: `${PROFILE.name} — ${PROFILE.role}`,
      description: PROFILE.tagline,
      path: '/',
      jsonLd: personJsonLd({
        name: PROFILE.name,
        jobTitle: PROFILE.role,
        description: PROFILE.tagline,
        origin: inject(SITE_URL),
        profiles: PROFILE.socials.map((social) => social.href),
        skills: RESUME.skills.flatMap((group) => group.items),
        university: 'HFT Stuttgart',
      }),
    });
  }
}
