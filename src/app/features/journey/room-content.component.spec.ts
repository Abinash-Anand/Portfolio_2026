import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RESUME } from '../../content/resume';
import type { EndpointId } from '../../core/experience';
import { PortfolioStore } from '../../data/portfolio.store';
import { makeProject, provideFixturePortfolio } from '../../data/testing';
import type { SceneHost } from '../../scene/scene-host';
import { SceneRegistry } from '../../scene/scene-registry';
import { RoomContent } from './room-content.component';

const PROJECTS = [
  makeProject({
    slug: 'SynthGraph',
    title: 'SynthGraph',
    summary: 'Data lineage for synthetic data.',
    repoUrl: 'https://github.com/me/SynthGraph',
    liveUrl: 'https://synthgraph.example',
    languages: [
      { name: 'TypeScript', color: null, percent: 70.9 },
      { name: 'Python', color: null, percent: 28.2 },
    ],
    featured: true,
  }),
  makeProject({ slug: 'ParkRabbit', title: 'ParkRabbit', featured: true }),
];

async function setup(endpoint: EndpointId, withWorld = true) {
  const setFocus = vi.fn();
  const host = { setFocus, stats: () => null } as unknown as SceneHost;
  TestBed.configureTestingModule({
    providers: [provideRouter([]), provideFixturePortfolio(PROJECTS)],
  });
  await TestBed.inject(PortfolioStore).load();
  const registry = TestBed.inject(SceneRegistry);
  if (withWorld) registry.register(host);

  const fixture = TestBed.createComponent(RoomContent);
  fixture.componentRef.setInput('endpoint', endpoint);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const buttons = () => [...el.querySelectorAll('button')];
  const button = (label: string) => buttons().find((b) => b.textContent?.includes(label))!;
  return { fixture, el, setFocus, registry, host, buttons, button };
}

describe('RoomContent', () => {
  describe('the facts, as text', () => {
    it('about: the dashboard of the concept', async () => {
      const { el } = await setup('about');
      expect(el.querySelector('h2')?.textContent).toContain(
        'ABINASH ANAND // FULL-STACK SOFTWARE ENGINEER',
      );
      expect(el.textContent).toContain('Stuttgart, Germany');
      expect(el.textContent).toContain('TypeScript, NestJS, React, Angular, PostgreSQL, Docker');
    });

    it('education: every degree with its institution, period and note', async () => {
      const { el } = await setup('education');
      for (const entry of RESUME.education) {
        for (const fact of [entry.degree, entry.institution, entry.period, entry.note]) {
          expect(el.textContent).toContain(fact);
        }
      }
    });

    it('skills: every group and every skill in it', async () => {
      const { el } = await setup('skills');
      for (const group of RESUME.skills) {
        expect(el.textContent).toContain(group.label);
        for (const item of group.items) expect(el.textContent).toContain(item);
      }
    });

    it('experience: every role with its organisation, period and achievements', async () => {
      const { el } = await setup('experience');
      for (const entry of RESUME.experience) {
        for (const fact of [entry.role, entry.organisation, entry.period, ...entry.highlights]) {
          expect(el.textContent).toContain(fact);
        }
      }
    });

    it('projects: a card per project with its page, repository and live links', async () => {
      const { el } = await setup('projects');
      expect(el.textContent).toContain('SynthGraph');
      expect(el.textContent).toContain('Data lineage for synthetic data.');
      expect(el.textContent).toContain('TypeScript 71% · Python 28%');
      expect(el.querySelector('a[href="/work/SynthGraph"]')).toBeTruthy();
      const external = [...el.querySelectorAll<HTMLAnchorElement>('a[target="_blank"]')];
      expect(external.map((a) => a.href)).toEqual([
        'https://github.com/me/SynthGraph',
        'https://synthgraph.example/',
        'https://github.com/me/sample',
      ]);
      expect(external.every((a) => a.rel.includes('noopener'))).toBe(true);
    });

    it('every room links to its plain 2D page, with the room named in a heading', async () => {
      const { el } = await setup('education');
      expect(el.querySelector('#room-title')?.textContent).toContain('GET /api/v1/education');
      expect(el.querySelector('a[href="/education"]')).toBeTruthy();
    });
  });

  describe('pointing the camera at an entry', () => {
    it('has plain titles, and no buttons, when there is no 3D world to look at', async () => {
      const { buttons, el } = await setup('education', false);
      expect(buttons()).toHaveLength(0);
      expect(el.textContent).toContain(RESUME.education[0]!.degree);
    });

    it('makes each title a button when a 3D world is running', async () => {
      const { buttons } = await setup('experience');
      expect(buttons()).toHaveLength(RESUME.experience.length);
      expect(buttons().every((b) => b.getAttribute('aria-pressed') === 'false')).toBe(true);
    });

    it('looks at an entry while it is hovered or focused, and lets go when it leaves', async () => {
      const { button, setFocus } = await setup('projects');
      const synth = button('SynthGraph');
      synth.dispatchEvent(new Event('mouseenter'));
      expect(setFocus).toHaveBeenLastCalledWith('SynthGraph');
      synth.dispatchEvent(new Event('mouseleave'));
      expect(setFocus).toHaveBeenLastCalledWith(null);

      button('ParkRabbit').dispatchEvent(new Event('focus'));
      expect(setFocus).toHaveBeenLastCalledWith('ParkRabbit');
      button('ParkRabbit').dispatchEvent(new Event('blur'));
      expect(setFocus).toHaveBeenLastCalledWith(null);
    });

    it('keeps the camera on a pressed entry, even after the pointer leaves, until pressed again', async () => {
      const { fixture, button, setFocus } = await setup('experience');
      const role = RESUME.experience[1]!.role;
      button(role).click();
      fixture.detectChanges();
      expect(setFocus).toHaveBeenLastCalledWith(RESUME.experience[1]!.id);
      expect(button(role).getAttribute('aria-pressed')).toBe('true');
      expect(button(role).textContent).toContain('LOOKING');

      button(role).dispatchEvent(new Event('mouseleave'));
      expect(setFocus).toHaveBeenLastCalledWith(RESUME.experience[1]!.id); // still pinned

      // Hovering another entry looks at it for the moment, then returns to the pinned one.
      const other = RESUME.experience[2]!.role;
      button(other).dispatchEvent(new Event('mouseenter'));
      expect(setFocus).toHaveBeenLastCalledWith(RESUME.experience[2]!.id);
      button(other).dispatchEvent(new Event('mouseleave'));
      expect(setFocus).toHaveBeenLastCalledWith(RESUME.experience[1]!.id);

      button(role).click();
      fixture.detectChanges();
      expect(setFocus).toHaveBeenLastCalledWith(null);
      expect(button(role).getAttribute('aria-pressed')).toBe('false');
    });

    it('starts free again in another room', async () => {
      const { fixture, button, setFocus } = await setup('education');
      button(RESUME.education[0]!.degree).click();
      fixture.componentRef.setInput('endpoint', 'skills');
      fixture.detectChanges();
      expect(button(RESUME.skills[0]!.label).getAttribute('aria-pressed')).toBe('false');
      button(RESUME.skills[0]!.label).click();
      expect(setFocus).toHaveBeenLastCalledWith(RESUME.skills[0]!.id);
    });

    it('releases the camera when the visitor leaves the room', async () => {
      const { fixture, setFocus } = await setup('skills');
      setFocus.mockClear();
      fixture.destroy();
      expect(setFocus).toHaveBeenCalledWith(null);
    });
  });
});
