import { Component, input } from '@angular/core';
import { ProjectSection } from '../../interface/project-section';

@Component({
  selector: 'app-generic-project-card-component',
  imports: [],
  templateUrl: './generic-project-card-component.html',
  styleUrl: './generic-project-card-component.css',
})
export class GenericProjectCardComponent {
  
  projectCardObject= input<ProjectSection>()

}
