import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PROFILE } from '../../content/profile';
import { RESUME } from '../../content/resume';
import type { EndpointId } from '../../core/experience';
import { PortfolioStore } from '../../data/portfolio.store';
import { endpointInfo } from '../../journey/endpoints';
import { SceneRegistry } from '../../scene/scene-registry';
import { TrackDirective } from '../../shared/directives/track.directive';
import { showcaseProjects } from './scene-content';

/**
 * What a room says, as real text. The 3D room is decoration for the eye; this is the same facts for everyone else
 * (screen readers, search, anyone without WebGL), taken from the same content as the room, so the two cannot
 * disagree. Each entry's title is also a control: hovering or focusing it points the 3D camera at that thing,
 * and pressing it keeps the camera there (a pod, a commit, a chip, a blade).
 */
@Component({
  selector: 'app-room-content',
  imports: [NgTemplateOutlet, RouterLink, TrackDirective],
  templateUrl: './room-content.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomContent {
  readonly endpoint = input.required<EndpointId>();

  private readonly registry = inject(SceneRegistry);
  private readonly store = inject(PortfolioStore);

  protected readonly profile = PROFILE;
  protected readonly resume = RESUME;
  protected readonly coreStack = 'TypeScript, NestJS, React, Angular, PostgreSQL, Docker';
  protected readonly info = computed(() => endpointInfo(this.endpoint()));
  protected readonly projects = computed(() =>
    showcaseProjects(this.store.projects(), this.store.featured()),
  );

  /** The entry the visitor pinned the camera to. */
  protected readonly pinned = signal<string | null>(null);
  /** Whether a 3D world is running to look at; without one the titles are plain headings. */
  protected readonly canLook = this.registry.active;

  constructor() {
    // Entering another room starts with the camera free again.
    effect(() => {
      this.endpoint();
      untracked(() => this.pinned.set(null));
    });
    inject(DestroyRef).onDestroy(() => this.registry.focus(null));
  }

  /** Hover or keyboard focus: look at this entry for as long as it is hovered or focused. */
  protected look(id: string): void {
    this.registry.focus(id);
  }

  /** The pointer or focus left an entry: back to the pinned entry, or free. */
  protected unlook(): void {
    this.registry.focus(this.pinned());
  }

  protected toggle(id: string): void {
    this.pinned.update((current) => (current === id ? null : id));
    this.registry.focus(this.pinned());
  }

  /** A short label for a project's languages: the top three with their share. */
  protected languages(slug: string): string {
    const project = this.store.project(slug);
    return (project?.languages ?? [])
      .slice(0, 3)
      .map((language) => `${language.name} ${Math.round(language.percent)}%`)
      .join(' · ');
  }
}
