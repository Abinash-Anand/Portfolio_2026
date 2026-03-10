import { Component, signal } from '@angular/core';
import { Homepage } from './component/homepage/homepage';

@Component({
  selector: 'app-root',
  imports: [Homepage],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Portfolio_2026');
}
