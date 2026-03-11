import { inject, Injectable } from '@angular/core';
import { GithubCache, GithubRepoData } from '../interface/github-cache';
import { of, tap } from 'rxjs';
import { Service } from './service';

@Injectable({
  providedIn: 'root',
})
export class GithubService {
  service = inject(Service)
   CACHE_TTL = 12 * 60 * 60 * 1000;
   getCachedData(): GithubCache | null {
    const cache  = localStorage.getItem('githubRepoCache');
    if(!cache) return null;
    return JSON.parse(cache)
   }

   isCacheValid(cache:GithubCache){
    const now = Date.now();
    return now - cache.timestamp < this.CACHE_TTL;
   }
   saveCache(data: GithubRepoData){

  const cache: GithubCache = {
    timestamp: Date.now(),
    data: data
  };

  localStorage.setItem("githubRepoCache", JSON.stringify(cache));

}
getGithubRepo( repo: string|null){

  const cache = this.getCachedData();

  if(cache && this.isCacheValid(cache)){
    console.log("isCacheValid👽:", cache)
    return of(cache.data);
  }
    console.log("isCacheValid:", cache)

  return this.service.loadGithubRepo(repo).pipe(
    tap(data => this.saveCache(data))
  );

}
  }
