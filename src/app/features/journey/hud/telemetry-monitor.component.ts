import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { EndpointId } from '../../../core/experience';
import { requestLines, SIMULATED_TAG } from '../../../journey/telemetry';
import { Typewriter } from './typewriter.component';

/**
 * The live request monitor shown while travelling. It is theatre: there is no backend, and the monitor says so
 * (CONCEPT.md A3). Never present these numbers as measurements.
 */
@Component({
  selector: 'app-telemetry-monitor',
  imports: [Typewriter],
  templateUrl: './telemetry-monitor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TelemetryMonitor {
  readonly endpoint = input.required<EndpointId>();
  readonly instant = input(false);

  protected readonly lines = computed(() => requestLines(this.endpoint()));
  protected readonly tag = SIMULATED_TAG;
}
