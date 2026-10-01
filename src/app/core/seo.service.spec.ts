import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Meta } from '@angular/platform-browser';
import { SITE_URL } from './config';
import { SeoService } from './seo.service';

describe('SeoService', () => {
  let seo: SeoService;
  let meta: Meta;
  let doc: Document;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: SITE_URL, useValue: 'https://example.test' }],
    });
    seo = TestBed.inject(SeoService);
    meta = TestBed.inject(Meta);
    doc = TestBed.inject(DOCUMENT);
  });

  const content = (selector: string): string | null | undefined => meta.getTag(selector)?.content;

  it('sets description, Open Graph tags and an absolute canonical URL', () => {
    seo.set({ title: 'Title', description: 'Desc', path: '/work/x' });
    expect(content('name="description"')).toBe('Desc');
    expect(content('property="og:title"')).toBe('Title');
    expect(content('property="og:url"')).toBe('https://example.test/work/x');
    expect(doc.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://example.test/work/x',
    );
    expect(content('name="twitter:card"')).toBe('summary');
  });

  it('adds an image only when one is given and removes it again afterwards', () => {
    seo.set({ title: 'T', description: 'D', path: '/', image: 'https://img.test/a.png' });
    expect(content('property="og:image"')).toBe('https://img.test/a.png');
    expect(content('name="twitter:card"')).toBe('summary_large_image');

    seo.set({ title: 'T', description: 'D', path: '/' });
    expect(content('property="og:image"')).toBeUndefined();
  });

  it('resets robots to indexable so a noindex page cannot leak into later pages', () => {
    meta.updateTag({ name: 'robots', content: 'noindex' });
    seo.set({ title: 'T', description: 'D', path: '/' });
    expect(content('name="robots"')).toBe('index, follow');
  });

  it('keeps a single canonical link across calls', () => {
    seo.set({ title: 'A', description: 'D', path: '/a' });
    seo.set({ title: 'B', description: 'D', path: '/b' });
    expect(doc.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
  });
});
