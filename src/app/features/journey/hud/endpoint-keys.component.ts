import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { EndpointId } from '../../../core/experience';
import { keycapLabel, type EndpointInfo } from '../../../journey/endpoints';

/**
 * The five console keycaps as real buttons: keyboard-operable and readable by screen readers.
 * (In the 3D scene they are physical keys; these buttons are their DOM mirror and stay the accessible path.)
 */
@Component({
  selector: 'app-endpoint-keys',
  templateUrl: './endpoint-keys.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EndpointKeys {
  readonly endpoints = input.required<readonly EndpointInfo[]>();
  readonly disabled = input(false);
  readonly selected = output<EndpointId>();
  /** The visitor is looking at (hovering or focusing) a key: its room can start preparing. */
  readonly hovered = output<EndpointId>();

  protected label(info: EndpointInfo): string {
    return keycapLabel(info);
  }
}
