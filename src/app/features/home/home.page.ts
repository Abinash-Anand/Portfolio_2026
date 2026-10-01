import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PROFILE } from '../../content/profile';
import { SeoService } from '../../core/seo.service';
import { PortfolioStore } from '../../data/portfolio.store';
import { TrackDirective } from '../../shared/directives/track.directive';
import { ProjectCard } from '../../shared/ui/project-card.component';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, ProjectCard, TrackDirective],
  templateUrl: './home.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  protected readonly profile = PROFILE;
  private readonly store = inject(PortfolioStore);
  protected readonly featured = computed(() => this.store.featured().slice(0, 3));

  constructor() {
    inject(SeoService).set({
      title: `${PROFILE.name} — ${PROFILE.role}`,
      description: PROFILE.tagline,
      path: '/',
    });
  }
}
