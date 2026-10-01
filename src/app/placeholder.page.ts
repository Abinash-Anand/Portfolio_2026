import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-placeholder-page',
  template: `
    <main>
      <h1>Abinash Anand</h1>
      <p>A new portfolio is on its way.</p>
      <p><a href="https://github.com/Abinash-Anand">GitHub</a></p>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaceholderPage {}
