// Shared walk / turn / sit state machine and path for the hero models (cut-out or rigged).
// Scroll sets the beats; once a model's window is reached she keeps walking on
// time, turns to the camera on arrival and then sits, so pausing the scroll
// never freezes her mid-stride.
import * as THREE from "three";
import { BEATS, HALL, HIP_V, KNEE_V, MODEL_H, SOFA, remap } from "./boutiqueLayout";

export type WalkState = { walk: number; turn: number; sit: number; gait: number; phase: number };

const WALK_SECONDS = 3.8;
const CYCLE_SECONDS = 1.1; // two steps

export const smooth = (t: number) => t * t * (3 - 2 * t);

export function newWalkState(index: number): WalkState {
  return { walk: 0, turn: 0, sit: 0, gait: 0, phase: index * 1.7 };
}

/** Advance one model's state by `dt` seconds at scroll progress `p`. */
export function stepWalk(st: WalkState, p: number, index: 0 | 1, dt: number, still: boolean) {
  if (still) {
    st.walk = 1;
    st.turn = 1;
    st.sit = 1;
    st.gait = 0;
    return;
  }
  const [w0, w1] = BEATS.walk[index];
  const [s0, s1] = BEATS.sit[index];
  const prev = st.walk;
  if (p < w0) st.walk += (0 - st.walk) * Math.min(1, dt * 5);
  else st.walk = Math.min(1, Math.max(st.walk, remap(p, w0, w1)) + dt / WALK_SECONDS);
  const speed = (Math.abs(st.walk - prev) / Math.max(dt, 1e-4)) * WALK_SECONDS;
  const moving = st.walk > 0.002 && st.walk < 0.999 ? Math.min(1, speed) : 0;
  st.gait += (moving - st.gait) * Math.min(1, dt * 3.2);
  if (st.gait > 0.02) st.phase += dt * ((Math.PI * 2) / CYCLE_SECONDS) * (0.35 + 0.65 * st.gait);
  const arrived = st.walk >= 0.999 ? 1 : 0;
  st.turn += (arrived - st.turn) * Math.min(1, dt * 2.8);
  const sitTarget = st.turn > 0.9 && p >= s0 ? 1 : 0;
  const rate = 1 / (1.3 - 0.6 * remap(p, s0, s1));
  const ds = sitTarget - st.sit;
  st.sit += Math.sign(ds) * Math.min(Math.abs(ds), dt * rate);
}

/**
 * Path: step out of the side doorway, walk inward toward the arch, and stop in front of the sofa seat (the
 * sitting hinge then carries the hips back onto it).
 */
export function walkPath(side: -1 | 1) {
  const thigh = (HIP_V - KNEE_V) * MODEL_H;
  const end = new THREE.Vector3(side * SOFA.seatX, 0, SOFA.hipZ + thigh * Math.sin(1.5));
  const start = new THREE.Vector3(side * 2.6, 0, HALL.doorZ);
  return new THREE.QuadraticBezierCurve3(start, new THREE.Vector3(side * 1.4, 0, end.z + 0.7), end);
}
