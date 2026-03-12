import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Service {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://api.github.com/repos/Abinash-Anand'

  loadGithubRepo(repoName: string | null): Observable<any> {

  const repo = this.http.get(`${this.baseUrl}/${repoName}`);

  const readme = this.http.get(
    `https://raw.githubusercontent.com/Abinash-Anand/${repoName}/main/README.md`,
    { responseType: 'text' }
  );

  const languages = this.http.get(`${this.baseUrl}/${repoName}/languages`);

  const issues = this.http.get(`${this.baseUrl}/${repoName}/issues`);

  const pulls = this.http.get(`${this.baseUrl}/${repoName}/pulls`);

  const milestones = this.http.get(`${this.baseUrl}/${repoName}/milestones`);

  return forkJoin({
    repo,
    readme,
    languages,
    issues,
    pulls,
    milestones
  });

}
  
}