import { Component, signal } from '@angular/core';
import { Homepage } from './component/homepage/homepage';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Portfolio_2026');
}
