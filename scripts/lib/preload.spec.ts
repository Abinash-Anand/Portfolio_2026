import { criticalFonts, withFontPreloads } from './preload';

const css = `@font-face{font-family:"Inter Variable";src:url(media/inter-latin-ext-wght-normal-AAA.woff2) format("woff2-variations")}
@font-face{font-family:"Inter Variable";src:url(media/inter-latin-wght-normal-NRMW37G5.woff2) format("woff2-variations")}
@font-face{font-family:"Space Grotesk Variable";src:url(media/space-grotesk-latin-wght-normal-LIGEH75C.woff2) format("woff2-variations")}
@font-face{font-family:"JetBrains Mono Variable";src:url(media/jetbrains-mono-latin-wght-normal-VBS632QH.woff2) format("woff2-variations")}`;

describe('criticalFonts', () => {
  it('picks the latin Inter and Space Grotesk files, and nothing else', () => {
    expect(criticalFonts(css)).toEqual([
      'media/inter-latin-wght-normal-NRMW37G5.woff2',
      'media/space-grotesk-latin-wght-normal-LIGEH75C.woff2',
    ]);
  });

  it('copes with quoted URLs, and skips a font that is not in the stylesheet', () => {
    expect(criticalFonts(`a{src:url("./media/inter-latin-wght-normal-X.woff2")}`)).toEqual([
      'media/inter-latin-wght-normal-X.woff2',
    ]);
    expect(criticalFonts('body{color:red}')).toEqual([]);
  });
});

describe('withFontPreloads', () => {
  const html = `<head><title>t</title><link rel="stylesheet" href="styles-ABC.css"></head>`;
  const fonts = ['media/inter-latin-wght-normal-X.woff2'];

  it('adds a crossorigin font preload before the stylesheet', () => {
    const result = withFontPreloads(html, fonts);
    expect(result).toContain(
      '<link rel="preload" as="font" href="media/inter-latin-wght-normal-X.woff2" type="font/woff2" crossorigin>',
    );
    expect(result.indexOf('rel="preload"')).toBeLessThan(result.indexOf('rel="stylesheet"'));
  });

  it('is idempotent', () => {
    const once = withFontPreloads(html, fonts);
    expect(withFontPreloads(once, fonts)).toBe(once);
  });

  it('leaves a page without a stylesheet, or without fonts, unchanged', () => {
    expect(withFontPreloads('<head></head>', fonts)).toBe('<head></head>');
    expect(withFontPreloads(html, [])).toBe(html);
  });
});
