// Shared layout and scroll timeline for the boutique hero scene. Everything is in
// metres: the corridor runs along -z from the entrance (z = 15) to the big
// scalloped arch (z = -2); the sofa sits in front of the arch. `p` is the pinned
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
  /** Side doorways the models step out of. */
  doorZ: 0.3,
  door: { w: 1.3, spring: 2.3, peak: 2.95 },
  pendants: [11.0, 8.2, 5.4] as const,
  chandelierZ: 0.6,
} as const;

export const SOFA = {
  width: 2.3,
  seatY: 0.46,
  backZ: -1.72,
  seatFrontZ: -0.92,
  /** Where the seated models' hips rest. */
  hipZ: -1.28,
  /** Seat positions (x) for the two models. */
  seatX: 0.52,
} as const;

/** Model height (m). The seat height equals the shin length so the feet stay planted. */
export const MODEL_H = 1.72;
/** Fractions of the cut-out height at the knee and hip (the sitting hinges). */
export const KNEE_V = 0.27;
export const HIP_V = 0.5;

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const remap = (v: number, a: number, b: number) => clamp01((v - a) / (b - a));
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const sineInOut = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

/** Scroll beats (fractions of the pinned scroll). */
export const BEATS = {
  curtain: [0.0, 0.3] as const,
  dolly: [0.03, 0.88] as const,
  /** Scroll window in which each model walks (walking then also runs on time). */
  walk: [
    [0.34, 0.64],
    [0.38, 0.68],
  ] as const,
  /** Scroll window in which each model sits. */
  sit: [
    [0.66, 0.82],
    [0.7, 0.86],
  ] as const,
  settle: [0.55, 0.94] as const,
};

/** Curtain opening 0..1 for a given progress. */
export const curtainOpen = (p: number) => remap(p, BEATS.curtain[0], BEATS.curtain[1]);
