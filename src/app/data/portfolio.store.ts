import { computed, inject, Injectable, signal } from '@angular/core';
import type { PortfolioIndex, PortfolioSource, Project, ProjectDetail } from './models';
import { PortfolioRepository } from './portfolio.repository';

/**
 * Signals store behind a facade: private writable state, public read-only computed views.
 * Loaded once at startup (see provideAppInitializer in app.config), so every page can read it synchronously.
 */
@Injectable({ providedIn: 'root' })
export class PortfolioStore {
  private readonly repository = inject(PortfolioRepository);
  private readonly state = signal<PortfolioIndex | null>(null);

  readonly loaded = computed(() => this.state() !== null);
  readonly source = computed<PortfolioSource | null>(() => this.state()?.source ?? null);
  readonly projects = computed<readonly Project[]>(() => this.state()?.projects ?? []);
  readonly featured = computed(() => this.projects().filter((p) => p.featured));
  readonly archive = computed(() => this.projects().filter((p) => !p.featured));
  private readonly bySlug = computed(
    () => new Map(this.projects().map((p) => [p.slug, p] as const)),
  );

  /** Languages used across projects, most common first. */
  readonly languages = computed(() => {
    const counts = new Map<string, number>();
    for (const project of this.projects()) {
      for (const language of project.languages) {
        counts.set(language.name, (counts.get(language.name) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name]) => name);
  });

  async load(): Promise<void> {
    if (this.state()) return;
    this.state.set(await this.repository.getIndex());
  }

  project(slug: string): Project | undefined {
    return this.bySlug().get(slug);
  }

  detail(slug: string): Promise<ProjectDetail | null> {
    return this.repository.getProjectDetail(slug);
  }
}
