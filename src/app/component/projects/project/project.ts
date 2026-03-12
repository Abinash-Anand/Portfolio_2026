import { Component, inject, input } from '@angular/core';
import { Navbar } from '../../navbar/navbar';
import { ActivatedRoute } from '@angular/router';
import { Service } from '../../../service/service';
import { GithubService } from '../../../service/github-service';
import { ProjectOverview } from './project-overview/project-overview';
import { GenericProjectCardComponent } from '../../generic-project-card-component/generic-project-card-component';
@Component({
  selector: 'app-project',
  imports: [Navbar,  ProjectOverview, GenericProjectCardComponent],
  templateUrl: './project.html',
  styleUrl: './project.css',
})
export class Project {
  service = inject(Service)
  githubService = inject(GithubService)
  route = inject(ActivatedRoute)
  projectRepoName :string | null = null
  projectSelectedObject = input()
  githubObject: {} = {}
  constructor(){
    this.projectRepoName = this.route.snapshot.paramMap.get("id")
    this.getGitRepoObject()
  }
getGitRepoObject(){
  this.githubService
    .getGithubRepo(this.projectRepoName)
    .subscribe(data => {
      this.githubObject = data
      // console.log("GitHub Data:", data?.readme);
      
    });
}
  

}