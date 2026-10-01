import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { PROFILE } from '../../content/profile';
import { RESUME } from '../../content/resume';
import { SeoService } from '../../core/seo.service';
import { PortfolioStore } from '../../data/portfolio.store';
import { TrackDirective } from '../../shared/directives/track.directive';
import { EducationSection } from './sections/education-section';
import { ExperienceSection } from './sections/experience-section';
import { ProjectsSection } from './sections/projects-section';
import { SkillsSection } from './sections/skills-section';

/** The complete 2D resume: the always-available, indexable, printable fallback to the 3D experience. */
@Component({
  selector: 'app-resume-page',
  imports: [EducationSection, ExperienceSection, ProjectsSection, SkillsSection, TrackDirective],
  templateUrl: './resume.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResumePage {
  protected readonly profile = PROFILE;
  protected readonly resume = RESUME;
  private readonly store = inject(PortfolioStore);
  protected readonly knownSlugs = computed(() => new Set(this.store.projects().map((p) => p.slug)));

  constructor() {
    inject(SeoService).set({
      title: `Resume — ${PROFILE.name}`,
      description: `${PROFILE.name}: ${PROFILE.role}. ${PROFILE.headlineStack}.`,
      path: '/resume',
    });
  }
}
