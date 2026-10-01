import { TestBed } from '@angular/core/testing';
import { Meta } from '@angular/platform-browser';
import { COLORS } from '../../core/design/tokens';
import { CAPABILITY_PROBE } from '../../motion/motion.service';
import { StyleguidePage } from './styleguide.page';

describe('StyleguidePage', () => {
  function render() {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: CAPABILITY_PROBE,
          useValue: () => ({
            reducedMotion: false,
            webgl2: true,
            hardwareConcurrency: 8,
            deviceMemoryGb: 8,
            coarsePointer: false,
            saveData: false,
          }),
        },
      ],
    });
    const fixture = TestBed.createComponent(StyleguidePage);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows every design token with its hex and live-computed contrast', () => {
    const el = render();
    const swatches = el.querySelector('section[aria-labelledby="sg-color"] ul');
    expect(swatches?.children.length).toBe(Object.keys(COLORS).length);
    expect(el.textContent).toContain('#3b82f6');
    expect(el.textContent).toMatch(/\d\.\d on void · \d\.\d on surface/);
  });

  it('reports no failing token (the page cannot disagree with the AA tests)', () => {
    expect(render().textContent).not.toContain('FAIL');
  });

  it('is an internal page: not indexable, with one h1 and labelled sections', () => {
    const el = render();
    expect(TestBed.inject(Meta).getTag('name="robots"')?.content).toContain('noindex');
    expect(el.querySelectorAll('h1')).toHaveLength(1);
    expect(el.querySelectorAll('section[aria-labelledby]').length).toBeGreaterThanOrEqual(5);
  });

  it('describes this device tier from the same service the scene uses', () => {
    expect(render().textContent).toContain('detected high');
  });

  it('documents the tier budgets and the static tier', () => {
    const el = render();
    const rows = [...el.querySelectorAll('tbody tr')].map((r) => r.textContent?.trim() ?? '');
    expect(rows).toHaveLength(4);
    expect(rows[3]).toContain('static');
    expect(rows[3]).toContain('No WebGL');
  });
});
