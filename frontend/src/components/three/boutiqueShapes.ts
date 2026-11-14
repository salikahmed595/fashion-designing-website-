// Geometry helpers for the boutique: the scalloped (multifoil) Mughal arch
// outline, wall slabs with those openings cut through and extruded so the
// reveals have depth, the brass bead moulding that traces an arch, and the
// picture-frame wainscot moulding.
import * as THREE from "three";

export type ArchSpec = { w: number; base: number; spring: number; peak: number; lobes?: number; depth?: number };

/** Points (u, v) of a scalloped arch, from the bottom-left corner up and round to the bottom-right. */
export function scallopOutline(cx: number, a: ArchSpec, samples = 120): THREE.Vector2[] {
  const { w, base, spring, peak } = a;
  const lobes = a.lobes ?? 7;
  const depth = a.depth ?? 0.085;
  const h = peak - spring;
  const L = cx - w / 2;
  const R = cx + w / 2;
  // Pointed arch as two cubic Béziers; lobes are pushed outward along the normal.
  const left = new THREE.CubicBezierCurve(
    new THREE.Vector2(L, spring),
    new THREE.Vector2(L, spring + h * 0.62),
    new THREE.Vector2(cx - w * 0.16, peak - h * 0.18),
    new THREE.Vector2(cx, peak),
  );
  const right = new THREE.CubicBezierCurve(
    new THREE.Vector2(cx, peak),
    new THREE.Vector2(cx + w * 0.16, peak - h * 0.18),
    new THREE.Vector2(R, spring + h * 0.62),
    new THREE.Vector2(R, spring),
  );
  const pts: THREE.Vector2[] = [new THREE.Vector2(L, base)];
  const centre = new THREE.Vector2(cx, spring - h * 0.4);
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const curve = t < 0.5 ? left : right;
    const lt = t < 0.5 ? t * 2 : (t - 0.5) * 2;
    const p = curve.getPoint(lt);
    const out = p.clone().sub(centre).normalize();
    const lobe = Math.abs(Math.sin(Math.PI * lobes * t));
    pts.push(p.add(out.multiplyScalar(depth * Math.pow(lobe, 0.6))));
  }
  pts.push(new THREE.Vector2(R, base));
  return pts;
}

function pathFrom(points: THREE.Vector2[], p: THREE.Path) {
  p.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) p.lineTo(points[i].x, points[i].y);
  p.closePath();
}

/** Wall slab (u along the wall, v up) with scalloped openings, extruded to show the reveals. */
export function wallGeometry(u0: number, u1: number, height: number, holes: { u: number; arch: ArchSpec }[], depth: number) {
  const s = new THREE.Shape();
  s.moveTo(u0, -0.05);
  s.lineTo(u1, -0.05);
  s.lineTo(u1, height);
  s.lineTo(u0, height);
  s.closePath();
  for (const h of holes) {
    const path = new THREE.Path();
    pathFrom(scallopOutline(h.u, h.arch), path);
    s.holes.push(path);
  }
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 4 });
}

/** A thin brass bead tracing an arch outline (centred at u = 0, in the XY plane). */
export function beadGeometry(a: ArchSpec, radius = 0.022) {
  const pts = scallopOutline(0, a, 160).map((p) => new THREE.Vector3(p.x, p.y, 0));
  const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.1);
  return new THREE.TubeGeometry(curve, 320, radius, 6, false);
}

/** Picture-frame moulding (1 wide x 1 tall, scaled per instance), bevelled. */
export function frameGeometry(border = 0.09) {
  const s = new THREE.Shape();
  s.moveTo(-0.5, 0);
  s.lineTo(0.5, 0);
  s.lineTo(0.5, 1);
  s.lineTo(-0.5, 1);
  s.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-0.5 + border, border * 0.6);
  hole.lineTo(-0.5 + border, 1 - border * 0.6);
  hole.lineTo(0.5 - border, 1 - border * 0.6);
  hole.lineTo(0.5 - border, border * 0.6);
  hole.closePath();
  s.holes.push(hole);
  return new THREE.ExtrudeGeometry(s, {
    depth: 0.015,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 2,
  });
}
