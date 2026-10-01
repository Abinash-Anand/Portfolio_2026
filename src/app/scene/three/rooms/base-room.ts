import { Group } from 'three';
import type { EndpointId } from '../../../core/experience';
import { damp, portraitFactor, type Pointer, type Pose } from '../camera-rig';
import { disposeObject } from '../dispose';
import type { ThreeProfile } from '../profiles';
import type { Room } from '../room';
import type { PulseField } from '../world/kit';
import { blendPose, pathPose, pingPong, type Waypoint } from '../world/path';

/**
 * What every room shares: a clock that starts when the visitor arrives, a camera that tours a path forever
 * (ping-pong, so it never jumps), an optional focus that pulls the camera to one thing in the room, pointer
 * parallax, and a complete teardown. A room supplies its world, its waypoints and what each focus id means.
 */
export abstract class BaseRoom implements Room {
  abstract readonly id: EndpointId;
  readonly object = new Group();

  /** Seconds since the visitor arrived. */
  protected time = 0;
  /** The camera tour; set by the subclass once its world is built. */
  protected waypoints: readonly Waypoint[] = [];
  /** Seconds for the camera to go down the path and back. */
  protected period = 80;

  private focusId: string | null = null;
  /** 0 = touring, 1 = fully on the focused thing. Eased every frame. */
  protected focusWeight = 0;
  private readonly view: Pose = { px: 0, py: 0, pz: 0, tx: 0, ty: 0, tz: 0, fov: 60 };
  private readonly focusPose: Pose = { px: 0, py: 0, pz: 0, tx: 0, ty: 0, tz: 0, fov: 60 };
  /** Glowing-dot fields the room registered; they follow the drawing-buffer scale and the clock. */
  private readonly pulseFields: PulseField[] = [];
  /** Reused for the single-waypoint lookup, so a focused frame allocates nothing. */
  private readonly single: Waypoint[] = [];

  /** Where the camera stands when `id` is focused, or null when this room has no such thing. */
  protected abstract focusWaypoint(id: string): Waypoint | null;
  /** Applies the tier's counts. */
  abstract setProfile(profile: ThreeProfile): void;
  /** Per-frame animation, only called while the room is visible. */
  protected abstract tick(dt: number, now: number): void;

  /** Adds a pulse field to the room and keeps it in step with the clock and the screen scale. */
  protected addPulses(field: PulseField): void {
    this.pulseFields.push(field);
    this.object.add(field.points);
  }

  setPixelScale(scale: number): void {
    for (const field of this.pulseFields) field.setPixelScale(scale);
  }

  get focused(): string | null {
    return this.focusId;
  }

  setFocus(id: string | null): void {
    this.focusId = id !== null && this.focusWaypoint(id) !== null ? id : null;
  }

  pose(t: number, pointer: Pointer, aspect: number): Pose {
    const pose = pathPose(this.waypoints, pingPong(t, this.period), this.view);
    if (this.focusId !== null && this.focusWeight > 0.001) {
      const waypoint = this.focusWaypoint(this.focusId);
      if (waypoint) {
        this.single[0] = waypoint;
        pathPose(this.single, 0, this.focusPose);
        const eased = this.focusWeight * this.focusWeight * (3 - 2 * this.focusWeight);
        blendPose(pose, this.focusPose, eased);
      }
    }
    // Looking around with the pointer is a little less when focused, so reading stays steady.
    const sway = 1 - 0.6 * this.focusWeight;
    pose.px += pointer.x * 0.4 * sway;
    pose.py += pointer.y * 0.2 * sway;
    pose.fov *= portraitFactor(aspect);
    return pose;
  }

  show(): void {
    this.time = 0;
    this.focusWeight = 0;
    this.object.visible = true;
  }

  hide(): void {
    this.object.visible = false;
  }

  update(dt: number, now: number): void {
    if (!this.object.visible) return;
    this.time += dt;
    this.focusWeight = damp(this.focusWeight, this.focusId !== null ? 1 : 0, 3.5, dt);
    for (const field of this.pulseFields) field.update(now);
    this.tick(dt, now);
  }

  dispose() {
    return disposeObject(this.object);
  }
}
