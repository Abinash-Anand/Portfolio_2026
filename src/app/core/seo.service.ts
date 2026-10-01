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
  /** Absolute URL of a share image. Without one, the site's default card is used. */
  readonly image?: string | null;
  readonly type?: 'website' | 'article';
  /** Structured data (schema.org) for the page, written as JSON-LD. Removed again when a page has none. */
  readonly jsonLd?: object | null;
  /** Defaults to indexable. Preview and internal routes pass `noindex`. */
  readonly robots?: string;
}

/** The share card used when a page has no image of its own (1200 x 630, in `public/assets`). */
export const DEFAULT_SHARE_IMAGE = '/assets/og-default.jpg';

/** Per-page meta description, canonical URL, Open Graph / Twitter tags and structured data. */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly site = inject(SITE_URL);

  set(page: PageSeo): void {
    const url = new URL(page.path, this.site).toString();
    this.name('description', page.description);
    // Reset first: a previous page (for example the 404 page) may have set noindex in this SPA.
    this.name('robots', page.robots ?? 'index, follow');
    this.property('og:site_name', SITE_NAME);
    this.property('og:title', page.title);
    this.property('og:description', page.description);
    this.property('og:type', page.type ?? 'website');
    this.property('og:url', url);
    this.property('og:locale', 'en_US');
    const image = page.image || new URL(DEFAULT_SHARE_IMAGE, this.site).toString();
    this.property('og:image', image);
    this.name('twitter:card', 'summary_large_image');
    this.name('twitter:image', image);
    this.canonical(url);
    this.structuredData(page.jsonLd ?? null);
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

  /** One JSON-LD block per page. `<` is escaped so the data can never close the script element early. */
  private structuredData(data: object | null): void {
    const existing = this.document.head.querySelector('script#seo-jsonld');
    if (!data) {
      existing?.remove();
      return;
    }
    const script = existing ?? this.document.createElement('script');
    script.setAttribute('id', 'seo-jsonld');
    script.setAttribute('type', 'application/ld+json');
    script.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
    if (!existing) this.document.head.appendChild(script);
  }
}
