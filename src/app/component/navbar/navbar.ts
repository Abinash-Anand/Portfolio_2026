import { Component, inject, input, OnInit } from '@angular/core';
import { ProgressSection } from '../../interface/progress-section';
import { ActivatedRoute, Router, RouterLink } from "@angular/router";

@Component({
  selector: 'app-navbar',
  imports: [RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar implements OnInit{
sections: ProgressSection[] = [
  { id: 'overview', label: 'Overview', route: 'overview' },
  { id: 'architecture', label: 'Architecture', route: 'architecture' },
  { id: 'userFlow', label: 'User Workflow', route: 'userFlow' },
  { id: 'eventFlow', label: 'Event Flow', route: 'eventFlow' },
  { id: 'techStack', label: 'Tech Stack', route: 'techStack' },
  { id: 'repository', label: 'Repository', route: 'repository' },
  { id: 'deployment', label: 'Deployment', route: 'deployment' },
  { id: 'challenges', label: 'Challenges', route: 'challenges' }
];
router = inject(Router)
route = inject(ActivatedRoute)
ngOnInit(): void {
}
changeProgressBar(section: ProgressSection){
  console.log(this.router.url)
  this.router.navigate(['./', section.route],{relativeTo:this.route})
  
}
}
