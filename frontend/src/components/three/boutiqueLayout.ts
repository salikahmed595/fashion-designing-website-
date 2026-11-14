// Shared layout and scroll timeline for the boutique hero scene. Everything is in
// metres: the hall runs along -z from the entrance (z = 16) to the big arch
// (z = -1.6); the sofa sits in front of the arch. `p` is the pinned scroll
// progress 0..1.

export const HALL = {
  halfWidth: 3.5,
  height: 5.2,
  wallDepth: 0.5,
  entranceZ: 16,
  endZ: -1.6,
  /** Centres (z) of the shelved alcoves on each side wall. */
  alcoves: [13.2, 10.4, 7.6, 4.8, 2.0],
  /** Side doorways the models step out of. */
  doorZ: 0.0,
  chandeliers: [13, 9, 5, 1.2],
} as const;

export const SOFA = {
  width: 2.5,
  seatY: 0.46,
  backZ: -1.3,
  seatFrontZ: -0.52,
  /** Where the seated models' hips rest. */
  hipZ: -0.86,
  /** Seat positions (x) for the two models. */
  seatX: 0.56,
} as const;

/** Model height (m). The seat height equals the shin length so the feet stay planted. */
export const MODEL_H = 1.72;

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const remap = (v: number, a: number, b: number) => clamp01((v - a) / (b - a));
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const sineInOut = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

/** Scroll beats (fractions of the pinned scroll). */
export const BEATS = {
  curtain: [0.0, 0.3] as const,
  dolly: [0.03, 0.86] as const,
  walk: [[0.34, 0.64], [0.38, 0.68]] as const,
  sit: [[0.64, 0.8], [0.68, 0.84]] as const,
  settle: [0.55, 0.92] as const,
};

/** Curtain opening 0..1 for a given progress. */
export const curtainOpen = (p: number) => remap(p, BEATS.curtain[0], BEATS.curtain[1]);
