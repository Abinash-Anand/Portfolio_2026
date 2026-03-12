export interface GithubCache {
      timestamp: number;
      data: GithubRepoData;
}
export interface GithubRepoData {
  repo: any;
  readme: string;
  languages: any;
  issues: any[];
  pulls: any[];
  milestones: any[];
}