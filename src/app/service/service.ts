import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Service {
  private http = inject(HttpClient);
 private  baseUrl = 'https://api.github.com/users/Abinash-Anand'
  getRepo(repoName:string): Observable<any>{
    return this.http.get(`${this.baseUrl}/${repoName}`);
  }
}
