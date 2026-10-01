import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProjectCard } from './project-card.component';

describe('ProjectCard', () => {
  function render(inputs: Record<string, unknown>): HTMLElement {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(ProjectCard);
    for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('links the title to the work page and lists the stack', () => {
    const el = render({ slug: 'ParkRabbit', title: 'ParkRabbit', summary: 'Events.', stack: ['Java', 'RabbitMQ'] });
    expect(el.querySelector('a')?.getAttribute('href')).toBe('/work/ParkRabbit');
    expect(el.querySelector('a')?.textContent?.trim()).toBe('ParkRabbit');
    expect(el.textContent).toContain('Events.');
    expect([...el.querySelectorAll('li')].map((li) => li.textContent?.trim())).toEqual(['Java', 'RabbitMQ']);
  });

  it('omits the summary and the stack list when there is nothing to show', () => {
    const el = render({ slug: 's', title: 'T' });
    expect(el.querySelector('p')).toBeNull();
    expect(el.querySelector('ul')).toBeNull();
  });
});
