import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { ExperienceEntry } from '../../../content/resume';

@Component({
  selector: 'app-experience-section',
  templateUrl: './experience-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExperienceSection {
  readonly entries = input.required<readonly ExperienceEntry[]>();
  /** Heading level of each entry title, so the page's outline stays correct. */
  readonly level = input<2 | 3>(3);
}
