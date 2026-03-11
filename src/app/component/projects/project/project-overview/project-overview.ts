import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProjectStage } from '../../../../interface/project-stage';

@Component({
  selector: 'app-project-overview',
  imports: [],
  templateUrl: './project-overview.html',
  styleUrl: './project-overview.css',
})
export class ProjectOverview {
   route = inject(ActivatedRoute)
  STAGE_CONTENT: Record<string, ProjectStage> = {

  overview: {
    title: "Project Overview",
    description: "High level description of the project",
    points: [
      "Problem statement",
      "Solution idea",
      "Key features"
    ]
  },

  architecture: {
    title: "System Architecture",
    description: "How the system components interact",
    points: [
      "Frontend Angular",
      "Backend API",
      "Database layer"
    ]
  },

  techStack: {
    title: "Tech Stack",
    description: "Technologies used in the project",
    points: [
      "Angular 21",
      "Node.js",
      "PostgreSQL"
    ]
  }

};
  stageData!: ProjectStage;

  ngOnInit() {

    const stage = this.route.snapshot.routeConfig?.path;

    this.stageData = this.STAGE_CONTENT[stage!];

  }
}
