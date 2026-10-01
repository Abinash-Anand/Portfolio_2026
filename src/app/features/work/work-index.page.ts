import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PROFILE } from '../../content/profile';
import { SeoService } from '../../core/seo.service';
import type { Project } from '../../data/models';
import { PortfolioStore } from '../../data/portfolio.store';
import { ProjectCard } from '../../shared/ui/project-card.component';

@Component({
  selector: 'app-work-index-page',
  imports: [DatePipe, ProjectCard, RouterLink],
  templateUrl: './work-index.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkIndexPage {
  private readonly store = inject(PortfolioStore);

  /** Selected language filter; null shows everything. */
  protected readonly language = signal<string | null>(null);
  protected readonly languageOptions = computed(() => this.store.languages().slice(0, 8));

  protected readonly featured = computed(() => this.filter(this.store.featured()));
  protected readonly archive = computed(() => this.filter(this.store.archive()));

  constructor() {
    inject(SeoService).set({
      title: `Work — ${PROFILE.name}`,
      description: `Projects by ${PROFILE.name}: featured work and the full list of public repositories.`,
      path: '/work',
    });
  }

  protected select(language: string | null): void {
    this.language.set(this.language() === language ? null : language);
  }

  private filter(projects: readonly Project[]): readonly Project[] {
    const language = this.language();
    return language
      ? projects.filter((p) => p.languages.some((l) => l.name === language))
      : projects;
  }
}
