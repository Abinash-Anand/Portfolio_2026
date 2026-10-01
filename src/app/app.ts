import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LEGAL } from './content/legal';
import { PROFILE } from './content/profile';
import { ShellService } from './core/shell.service';
import { PortfolioStore } from './data/portfolio.store';
import { TrackDirective } from './shared/directives/track.directive';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TrackDirective],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly profile = PROFILE;
  /** The Impressum is linked only once its postal address has been supplied. */
  protected readonly impressumReady = LEGAL.address !== null;
  protected readonly store = inject(PortfolioStore);
  protected readonly shell = inject(ShellService);
}
