import { Component, inject, input, OnInit } from '@angular/core';
import { Navbar } from '../../navbar/navbar';
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { Service } from '../../../service/service';
import { GithubService } from '../../../service/github-service';

@Component({
  selector: 'app-project',
  imports: [Navbar, RouterOutlet],
  templateUrl: './project.html',
  styleUrl: './project.css',
})
export class Project {
  service = inject(Service)
    githubService = inject(GithubService)
  route = inject(ActivatedRoute)
  projectRepoName :string | null = null
  projectSelectedObject = input()
  constructor(){
    this.projectRepoName = this.route.snapshot.paramMap.get("id")
    this.getGitRepoObject()
  }
getGitRepoObject(){
  this.githubService
    .getGithubRepo(this.projectRepoName)
    .subscribe(data => {
      console.log("GitHub Data:", data);
    });
}
  

}