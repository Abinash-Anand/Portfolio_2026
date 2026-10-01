/**
 * Vocabulary shared by the experience engine, analytics and pages: the five endpoints of the
 * "Packet's Journey" (CONCEPT.md section 3) and the quality tiers (DESIGN.md section 14).
 */

export const ENDPOINT_IDS = ['about', 'education', 'skills', 'projects', 'experience'] as const;
export type EndpointId = (typeof ENDPOINT_IDS)[number];

/** Richest first. `static` means no WebGL: the 2D resume. */
export const TIER_IDS = ['high', 'medium', 'low', 'static'] as const;
export type TierId = (typeof TIER_IDS)[number];
