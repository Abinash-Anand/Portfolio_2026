import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TrackDirective } from '../directives/track.directive';

/** Presentational card for a project; takes plain inputs so `shared` never depends on `data`. */
@Component({
  selector: 'app-project-card',
  imports: [RouterLink, TrackDirective],
  templateUrl: './project-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectCard {
  readonly slug = input.required<string>();
  readonly title = input.required<string>();
  readonly summary = input<string>('');
  readonly stack = input<readonly string[]>([]);
  readonly featured = input(false);
}
