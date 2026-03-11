import { Routes } from '@angular/router';
import { Homepage } from './component/homepage/homepage';
import { Project } from './component/projects/project/project';
import { ProjectOverview } from './component/projects/project/project-overview/project-overview';
import { ProjectArchitecture } from './component/projects/project/project-architecture/project-architecture';
import { UserWorkflow } from './component/projects/project/user-workflow/user-workflow';
import { EventWorkflow } from './component/projects/project/event-workflow/event-workflow';
import { TechStack } from './component/projects/project/tech-stack/tech-stack';
import { Repository } from './component/projects/project/repository/repository';
import { Deployment } from './component/projects/project/deployment/deployment';
import { Challenges } from './component/projects/project/challenges/challenges';

export const routes: Routes = [
    {path:'', component: Homepage},
    {path:'project/:id', component:Project, children:[
        {path:'overview', component:ProjectOverview},
        {path:'architecture', component:ProjectArchitecture},
        {path:'userFlow', component:UserWorkflow},
        {path:'eventFlow', component:EventWorkflow},
        {path:'techStack', component:TechStack},
        {path:'repository', component:Repository},
        {path:'deployment', component:Deployment},
        {path:'challenges', component:Challenges}
    ]},

    {path:'**', component:Homepage}
];
