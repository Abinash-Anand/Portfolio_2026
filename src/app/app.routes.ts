import type { Routes, UrlMatcher } from '@angular/router';
import { projectPageResolver } from './data/project-page.resolver';
import { PortfolioStore } from './data/portfolio.store';
import { inject } from '@angular/core';

/**
 * v1 URLs were `/project/<id>` (+ optional section). v2 uses `/work/<repo-name>`.
 * Only ids that differ from the GitHub repository name need an entry here.
 */
const LEGACY_PROJECT_SLUGS: Readonly<Record<string, string>> = {
  eber: 'Eber-app',
};

const legacyRedirect = ({ params }: { params: Record<string, string | undefined> }): string => {
  const id = params['id'] ?? '';
  return `/work/${LEGACY_PROJECT_SLUGS[id] ?? id}`;
};

/**
 * `/journey` (the console) and `/journey/:endpoint` (a room) are ONE route, so the page, and the 3D world inside it,
 * stay alive while the visitor moves between rooms, and Back and Forward just change the endpoint it is given.
 */
export const journeyMatcher: UrlMatcher = (segments) => {
  const [first, second] = segments;
  if (first?.path !== 'journey' || segments.length > 2) return null;
  return second ? { consumed: segments, posParams: { endpoint: second } } : { consumed: segments };
};

const loadSectionPage = () => import('./features/resume/section.page').then((m) => m.SectionPage);

export const routes: Routes = [
  {
    path: '',
    title: 'Abinash Anand — Full-Stack Software Engineer',
    loadComponent: () => import('./features/home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'work',
    title: 'Work — Abinash Anand',
    loadComponent: () => import('./features/work/work-index.page').then((m) => m.WorkIndexPage),
  },
  {
    path: 'work/:slug',
    title: (route) => {
      const project = inject(PortfolioStore).project(route.paramMap.get('slug') ?? '');
      return project ? `${project.title} — Abinash Anand` : 'Project not found — Abinash Anand';
    },
    resolve: { page: projectPageResolver },
    loadComponent: () => import('./features/work/work-detail.page').then((m) => m.WorkDetailPage),
  },
  {
    path: 'resume',
    title: 'Resume — Abinash Anand',
    loadComponent: () => import('./features/resume/resume.page').then((m) => m.ResumePage),
  },
  {
    path: 'about',
    title: 'About — Abinash Anand',
    data: { section: 'about' },
    loadComponent: loadSectionPage,
  },
  {
    path: 'experience',
    title: 'Experience — Abinash Anand',
    data: { section: 'experience' },
    loadComponent: loadSectionPage,
  },
  {
    path: 'skills',
    title: 'Skills — Abinash Anand',
    data: { section: 'skills' },
    loadComponent: loadSectionPage,
  },
  {
    path: 'education',
    title: 'Education — Abinash Anand',
    data: { section: 'education' },
    loadComponent: loadSectionPage,
  },
  // Preview routes for the experience engine (not linked from the site, not indexed).
  {
    matcher: journeyMatcher,
    title: "Experience preview — Packet's Journey",
    loadComponent: () => import('./features/journey/journey.page').then((m) => m.JourneyPage),
  },
  {
    path: 'styleguide',
    title: 'Styleguide — Abinash Anand',
    loadComponent: () =>
      import('./features/styleguide/styleguide.page').then((m) => m.StyleguidePage),
  },
  // The "projects" endpoint of the planned experience is the work list in 2D.
  { path: 'projects', redirectTo: 'work' },
  { path: 'project/:id', redirectTo: legacyRedirect },
  { path: 'project/:id/:section', redirectTo: legacyRedirect },
  {
    path: 'not-found',
    title: 'Page not found — Abinash Anand',
    loadComponent: () => import('./features/not-found/not-found.page').then((m) => m.NotFoundPage),
  },
  {
    path: '**',
    title: 'Page not found — Abinash Anand',
    loadComponent: () => import('./features/not-found/not-found.page').then((m) => m.NotFoundPage),
  },
];
