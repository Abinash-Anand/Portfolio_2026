import { Component, inject, input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GenericProjectCardComponent } from '../../../generic-project-card-component/generic-project-card-component';

@Component({
  selector: 'app-project-overview',
  imports: [GenericProjectCardComponent],
  templateUrl: './project-overview.html',
  styleUrl: './project-overview.css',
})
export class ProjectOverview {
  route = inject(ActivatedRoute)
 


}
