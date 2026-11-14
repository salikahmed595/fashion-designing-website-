// Shared layout and scroll timeline for the boutique hero scene. Everything is in
// metres: the corridor runs along -z from the entrance (z = 15) to the big
// scalloped arch (z = -2), which holds the wardrobe. `p` is the pinned
// scroll progress 0..1.

export const HALL = {
  halfWidth: 3.0,
  height: 4.0,
  /** Depth of the side walls (= niche recess). */
  wallDepth: 0.62,
  entranceZ: 15,
  endZ: -2.0,
  /** Centres (z) of the scalloped garment niches on each side wall. */
  niches: [12.4, 9.6, 6.8, 4.0] as const,
  niche: { w: 2.0, base: 0.32, spring: 2.5, peak: 3.2 },
  /** Side doorways (fitting rooms). */
  doorZ: 0.3,
  door: { w: 1.3, spring: 2.3, peak: 2.95 },
  pendants: [11.0, 8.2, 5.4] as const,
  chandelierZ: 0.6,
} as const;

/**
 * The walk-in wardrobe set into the big end arch (the end of the journey): front
 * face at `frontZ`, back panel against the niche wall.
 */
export const WARDROBE = {
  width: 3.2,
  height: 2.5,
  frontZ: HALL.endZ + 0.05,
  depth: 0.7,
  /** Width of the glass-door centre bay. */
  centre: 1.12,
} as const;

/** Final camera framing in front of the wardrobe (wide and narrow screens). */
export const FINAL_CAM = {
  wide: { z: 1.75, y: 1.38, lookY: 1.25, fov: 42 },
  narrow: { z: 2.9, y: 1.3, lookY: 1.2, fov: 54 },
} as const;

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const remap = (v: number, a: number, b: number) => clamp01((v - a) / (b - a));
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const sineInOut = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

/** Scroll beats (fractions of the pinned scroll). The 3D fades into the page after `fade`. */
export const BEATS = {
  curtain: [0.0, 0.3] as const,
  dolly: [0.03, 0.84] as const,
  doors: [0.6, 0.84] as const,
  fade: [0.86, 0.98] as const,
};

/** Curtain opening 0..1 for a given progress. */
export const curtainOpen = (p: number) => remap(p, BEATS.curtain[0], BEATS.curtain[1]);
