import { Component, input } from '@angular/core';

@Component({
  selector: 'app-floating-preview',
  imports: [],
  templateUrl: './floating-preview.html',
  styleUrl: './floating-preview.css',
})
export class FloatingPreview {
  visible = input<boolean>(false)
  x = input<number>(0)
  y = input<number>(0)
  image = input<string>('')
}
