import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { SkillGroup, SpokenLanguage } from '../../../content/resume';

@Component({
  selector: 'app-skills-section',
  templateUrl: './skills-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillsSection {
  readonly groups = input.required<readonly SkillGroup[]>();
  readonly spoken = input<readonly SpokenLanguage[]>([]);
  readonly level = input<2 | 3>(3);
}
