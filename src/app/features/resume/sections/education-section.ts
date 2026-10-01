import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { EducationEntry } from '../../../content/resume';

@Component({
  selector: 'app-education-section',
  templateUrl: './education-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EducationSection {
  readonly entries = input.required<readonly EducationEntry[]>();
  readonly level = input<2 | 3>(3);
}
