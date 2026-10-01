import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PROFILE } from '../../content/profile';
import { SeoService } from '../../core/seo.service';
import type { ProjectPageData } from '../../data/models';
import { SafeHtmlPipe } from '../../shared/pipes/safe-html.pipe';

@Component({
  selector: 'app-work-detail-page',
  imports: [DatePipe, RouterLink, SafeHtmlPipe],
  templateUrl: './work-detail.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkDetailPage {
  /** Resolved by `projectPageResolver` and bound through `withComponentInputBinding()`. */
  readonly page = input.required<ProjectPageData>();

  private readonly seo = inject(SeoService);

  constructor() {
    effect(() => {
      const { project } = this.page();
      this.seo.set({
        title: `${project.title} — ${PROFILE.name}`,
        description: project.summary || `${project.title}, a project by ${PROFILE.name}.`,
        path: `/work/${project.slug}`,
        image: project.cover,
        type: 'article',
      });
    });
  }
}
