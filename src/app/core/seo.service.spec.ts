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
    expect(content('name="twitter:card"')).toBe('summary_large_image');
    expect(content('property="og:locale"')).toBe('en_US');
  });

  it('uses the page image when it has one, and the default share card when it does not', () => {
    seo.set({ title: 'T', description: 'D', path: '/', image: 'https://img.test/a.png' });
    expect(content('property="og:image"')).toBe('https://img.test/a.png');
    expect(content('name="twitter:image"')).toBe('https://img.test/a.png');

    seo.set({ title: 'T', description: 'D', path: '/' });
    expect(content('property="og:image"')).toBe('https://example.test/assets/og-default.jpg');
    expect(content('name="twitter:image"')).toBe('https://example.test/assets/og-default.jpg');
  });

  describe('structured data', () => {
    const block = () => doc.head.querySelector('script#seo-jsonld');

    it('writes one JSON-LD block, replaces it on the next page and removes it when a page has none', () => {
      seo.set({
        title: 'A',
        description: 'D',
        path: '/a',
        jsonLd: { '@type': 'Person', name: 'A' },
      });
      expect(block()?.getAttribute('type')).toBe('application/ld+json');
      expect(JSON.parse(block()!.textContent!)).toEqual({ '@type': 'Person', name: 'A' });

      seo.set({
        title: 'B',
        description: 'D',
        path: '/b',
        jsonLd: { '@type': 'Thing', name: 'B' },
      });
      expect(doc.head.querySelectorAll('script#seo-jsonld')).toHaveLength(1);
      expect(JSON.parse(block()!.textContent!).name).toBe('B');

      seo.set({ title: 'C', description: 'D', path: '/c' });
      expect(block()).toBeNull();
    });

    it('can never be closed early by data that contains markup', () => {
      seo.set({ title: 'A', description: 'D', path: '/a', jsonLd: { name: '</script><b>x' } });
      expect(block()!.textContent).not.toContain('<');
      expect(JSON.parse(block()!.textContent!).name).toBe('</script><b>x');
    });
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
