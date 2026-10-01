import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PROFILE } from '../../content/profile';
import { RESUME } from '../../content/resume';
import { SeoService } from '../../core/seo.service';
import { EducationSection } from './sections/education-section';
import { ExperienceSection } from './sections/experience-section';
import { SkillsSection } from './sections/skills-section';

export type SectionId = 'about' | 'experience' | 'skills' | 'education';

/**
 * One 2D page per endpoint of the planned experience (`/about`, `/experience`, `/skills`, `/education`).
 * The section id arrives from route data via component input binding.
 */
@Component({
  selector: 'app-section-page',
  imports: [RouterLink, EducationSection, ExperienceSection, SkillsSection],
  templateUrl: './section.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionPage {
  readonly section = input.required<SectionId>();

  protected readonly profile = PROFILE;
  protected readonly resume = RESUME;
  private readonly seo = inject(SeoService);

  protected readonly description = computed(() => {
    switch (this.section()) {
      case 'about':
        return PROFILE.tagline;
      case 'experience':
        return `Professional experience of ${PROFILE.name}: Letstream, Elluminati Ventures and HFT Stuttgart.`;
      case 'skills':
        return `Skills of ${PROFILE.name}: ${PROFILE.headlineStack}, plus data, architecture and AI-assisted engineering.`;
      case 'education':
        return `Education of ${PROFILE.name}: M.Sc. Software Technology at HFT Stuttgart and a B.Tech. in Information Technology.`;
    }
  });

  constructor() {
    effect(() => {
      const section = this.section();
      this.seo.set({
        title: `${section[0]?.toUpperCase()}${section.slice(1)} — ${PROFILE.name}`,
        description: this.description(),
        path: `/${section}`,
      });
    });
  }
}
