import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ProjectEntry } from '../../../content/resume';

@Component({
  selector: 'app-projects-section',
  imports: [RouterLink],
  templateUrl: './projects-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectsSection {
  readonly entries = input.required<readonly ProjectEntry[]>();
  /** Repository slugs that have a work page; only those entries get a link. */
  readonly knownSlugs = input<ReadonlySet<string>>(new Set());
  readonly level = input<2 | 3>(3);
}
