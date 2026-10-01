import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { SITE_NAME, SITE_URL } from './config';

export interface PageSeo {
  /** Full page title (also used for og:title). The document title itself comes from the router. */
  readonly title: string;
  readonly description: string;
  /** Path of the page, for example `/work/ParkRabbit`. */
  readonly path: string;
  readonly image?: string | null;
  readonly type?: 'website' | 'article';
}

/** Per-page meta description, canonical URL and Open Graph / Twitter tags. */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly site = inject(SITE_URL);

  set(page: PageSeo): void {
    const url = new URL(page.path, this.site).toString();
    this.name('description', page.description);
    // Reset first: a previous page (for example the 404 page) may have set noindex in this SPA.
    this.name('robots', 'index, follow');
    this.property('og:site_name', SITE_NAME);
    this.property('og:title', page.title);
    this.property('og:description', page.description);
    this.property('og:type', page.type ?? 'website');
    this.property('og:url', url);
    this.name('twitter:card', page.image ? 'summary_large_image' : 'summary');
    if (page.image) {
      this.property('og:image', page.image);
    } else {
      this.meta.removeTag(`property='og:image'`);
    }
    this.canonical(url);
  }

  private name(name: string, content: string): void {
    this.meta.updateTag({ name, content });
  }

  private property(property: string, content: string): void {
    this.meta.updateTag({ property, content });
  }

  private canonical(url: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
}
