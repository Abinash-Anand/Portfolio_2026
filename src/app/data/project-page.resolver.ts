import { inject } from '@angular/core';
import { RedirectCommand, Router, type ResolveFn } from '@angular/router';
import type { ProjectPageData } from './models';
import { PortfolioStore } from './portfolio.store';

/**
 * Resolves a project and its README before the page renders (so prerendering sees real content).
 * Unknown slugs redirect to `/not-found` (the URL says so, whether the visitor arrived by link or by click).
 */
export const projectPageResolver: ResolveFn<ProjectPageData | RedirectCommand> = async (route) => {
  const store = inject(PortfolioStore);
  const router = inject(Router);
  const project = store.project(route.paramMap.get('slug') ?? '');
  if (!project) {
    return new RedirectCommand(router.parseUrl('/not-found'));
  }
  const detail = project.hasReadme ? await store.detail(project.slug) : null;
  return { project, detail };
};
