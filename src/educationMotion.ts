// Deterministic crossfade motion for the About section's Education progression: the two fixed chapters (tuple
// position 0 = Foundation, 1 = Depth) mirror each other's opacity/position across the same scroll range. The
// function reads only the chapter's position in the fixed tuple, never its institution, degree or field, so it
// carries no degree-specific branching. Bounded well inside the site's structural-layer conventions (small travel,
// no scale/rotate), but deliberately does not rest at full opacity at the scene's middle keyframe the way a
// one-time reveal does: here one chapter is legitimately more emphasized than the other at every point along the
// scroll range, which is the entire point of the progression.
export type EducationChapterMotion = { readonly opacity: string; readonly y: string };

const floor = 0.2;
const resting = 0.6;
const peak = 1;

export function educationChapterMotion(index: 0 | 1): EducationChapterMotion {
  const leading = index === 0;
  return {
    opacity: leading ? `${peak},${resting},${floor}` : `${floor},${resting},${peak}`,
    y: leading ? "0,-6,-18" : "18,6,0",
  };
}

/** The progression indicator's travel distance (px): shared with the CSS custom property that sizes its track, so the two never drift apart. */
export const educationIndicatorHeight = 200;
export const educationMarkerTravel = `0,${educationIndicatorHeight / 2},${educationIndicatorHeight}`;
