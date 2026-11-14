"use client";
// WebGL bridal curtain for the hero: two magenta-crimson silk halves with a gold
// zari border down their inner edges and along the hem. They meet in the centre;
// as the scroll opens it they part from the middle, pull to the sides, gather into
// tighter and tighter pleats (bunching toward the outer edges, the hem trailing
// the top like real stage drapes) and finally slide out of view.
// The halves are screen-locked: they follow the camera every frame, render on
// layer 1 (so the floor reflector never mirrors them) and draw over the scene.
import { useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { curtainOpen } from "./boutiqueLayout";

/** Layer the curtain lives on. The main camera must enable it. */
export const CURTAIN_LAYER = 1;
/** Distance in front of the camera at which the curtain planes sit. */
const DIST = 4.2;

const vertex = /* glsl */ `
  uniform float uOpen;
  uniform float uSide;   // -1 left half, +1 right half
  uniform vec2 uHalf;    // half extents of the view at the curtain's distance
  uniform float uTime;
  varying vec2 vFab;     // x: fabric distance from the inner edge, y: height
  varying vec3 vNormal;
  varying float vGather;
  varying float vFold;
  varying vec2 vScreen;

  const float FOLDS = 11.0;

  // Position of the cloth at uv (x: 0 outer edge .. 1 inner edge). zScale only
  // exaggerates the fold depth for the shading normal.
  vec3 drape(vec2 uv, float zScale) {
    float open = clamp(uOpen, 0.0, 1.0);
    // Top of the drape leads, the hem trails a little behind.
    float ov = clamp(open + (uv.y - 0.5) * 0.18 * sin(3.14159 * open), 0.0, 1.0);
    float g = smoothstep(0.0, 0.78, ov);          // gathering
    float sl = smoothstep(0.6, 1.0, ov);           // sliding off screen
    float k = mix(1.0, 0.13, g);                   // remaining width
    float a = pow(uv.x, mix(1.0, 1.55, g));        // outer folds bunch tighter
    float fabW = uHalf.x + 0.06;
    float x = uSide * (uHalf.x * 1.03 - a * fabW * k);
    x += uSide * sl * (fabW * 0.2 + 0.5);
    float y = (uv.y - 0.5) * uHalf.y * 2.08;
    // Swag: the inner hem lifts slightly as the drape is drawn back.
    float hem = (1.0 - uv.y) * (1.0 - uv.y);
    y += hem * uv.x * g * uHalf.y * 0.16;
    x += uSide * hem * uv.x * g * 0.12;
    // Pleats deepen as the cloth gathers; a slow breeze while closed.
    float th = uv.x * FOLDS * 6.28318 + sin(uv.y * 3.0 + uTime * 0.6) * 0.35 * (1.0 - g);
    float amp = 0.02 + 0.07 * g;
    float z = -cos(th) * amp * zScale;
    z += sin(uv.y * 2.6 + uTime * 0.7 + uSide) * 0.03 * (1.0 - g);
    z += g * (1.0 - uv.x) * 0.15;                  // the bundle bulges forward
    return vec3(x, y, z);
  }

  void main() {
    vec3 p = drape(uv, 1.0);
    vec3 q = drape(uv, 5.0);
    vec3 dx = drape(uv + vec2(0.004, 0.0), 5.0) - q;
    vec3 dy = drape(uv + vec2(0.0, 0.01), 5.0) - q;
    vec3 n = normalize(cross(dx, dy));
    if (n.z < 0.0) n = -n;
    vNormal = n;
    float open = clamp(uOpen, 0.0, 1.0);
    vGather = smoothstep(0.0, 0.78, open);
    vFold = cos(uv.x * FOLDS * 6.28318);
    vFab = vec2((1.0 - uv.x) * (uHalf.x + 0.06), p.y);
    vec4 clip = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    vScreen = clip.xy / clip.w * 0.5 + 0.5;
    gl_Position = clip;
  }
`;

const fragment = /* glsl */ `
  uniform vec2 uHalf;
  uniform vec3 uBase;
  uniform vec3 uDeep;
  uniform vec3 uGold;
  varying vec2 vFab;
  varying vec3 vNormal;
  varying float vGather;
  varying float vFold;
  varying vec2 vScreen;

  float circle(vec2 p, float r) { return smoothstep(r, r - 0.04, length(p)); }

  // Buti: a dot with four petals on a staggered grid.
  float buti(vec2 w, float cell) {
    vec2 q = w / cell;
    vec2 id = floor(q);
    vec2 g = fract(q) - 0.5;
    g.x += mod(id.y, 2.0) * 0.5 - 0.25;
    g.x = fract(g.x + 0.5) - 0.5;
    float a = atan(g.y, g.x);
    float r = length(g);
    float petal = smoothstep(0.16, 0.13, r - 0.05 * cos(a * 4.0));
    return max(petal * 0.85, circle(g, 0.06));
  }

  // Zari border band (w.x runs along the band, by = distance into the band):
  // solid kinari strip, arches, a chevron run and a row of dots.
  float border(vec2 w, float by) {
    float band = step(0.0, by) * step(by, 0.72);
    float kinari = step(0.0, by) * step(by, 0.05);
    vec2 g = vec2(fract(w.x / 0.24) - 0.5, (by - 0.1) / 0.24);
    float arch = smoothstep(0.08, 0.03, abs(length(g) - 0.42)) * step(0.0, g.y) * step(g.y, 0.5);
    float zig = abs(fract(w.x / 0.42) - 0.5) * 0.32;
    float chevron = smoothstep(0.018, 0.0, abs(by - 0.3 - zig)) + smoothstep(0.012, 0.0, abs(by - 0.38 - zig));
    float dots = circle(vec2(fract(w.x / 0.11) - 0.5, (by - 0.64) / 0.11), 0.22);
    float lines = smoothstep(0.012, 0.0, abs(by - 0.72)) + smoothstep(0.008, 0.0, abs(by - 0.58));
    return clamp(kinari + band * (arch + chevron + dots) + lines, 0.0, 1.0);
  }

  void main() {
    vec3 n = normalize(vNormal);
    vec3 light = normalize(vec3(-0.35, 0.55, 0.75));
    float diff = clamp(dot(n, light), 0.0, 1.0);
    float r = clamp(dot(reflect(-light, n), vec3(0.0, 0.0, 1.0)), 0.0, 1.0);
    float sheen = pow(r, 22.0) + pow(r, 4.0) * 0.2;

    float shade = pow(diff, 1.5);
    vec3 col = mix(uDeep, uBase, 0.1 + shade * 1.05);
    // Pleat valleys darken as the drape bunches up.
    col *= 1.0 - vGather * 0.35 * (0.5 - 0.5 * vFold);

    // Inner-edge border (vertical) and hem border (horizontal).
    // Pattern space: finer than world units so the motifs read as woven detail.
    vec2 f = vFab * 2.1;
    float inner = border(vec2(f.y, 0.0), f.x - 0.04);
    float hemBy = (vFab.y + uHalf.y * 1.04) * 2.1 - 0.3;
    float hem = border(vec2(f.x, 0.0), hemBy);
    float zari = max(inner, hem);
    float field = smoothstep(0.82, 0.98, f.x) * smoothstep(0.82, 0.98, hemBy);
    zari = max(zari, buti(f, 0.42) * field * 0.55);
    col = mix(col, uGold * (0.55 + diff * 0.8), zari);
    col += sheen * mix(vec3(1.0, 0.7, 0.82), vec3(1.0, 0.92, 0.7), zari) * 0.55;
    // A fine gold edge right at the leading edge, and a darker top under the navbar.
    col = mix(col, uGold * 1.15, smoothstep(0.014, 0.0, vFab.x));
    col *= mix(1.0, 0.7, smoothstep(0.72, 1.0, vScreen.y));
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

function Half({ side, progress }: { side: -1 | 1; progress: RefObject<number> }) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uOpen: { value: 0 },
      uSide: { value: side },
      uHalf: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uBase: { value: new THREE.Color("#b50e62") },
      uDeep: { value: new THREE.Color("#3a0a22") },
      uGold: { value: new THREE.Color("#d9b25c") },
    }),
    [side],
  );
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1, 220, 48), []);

  useFrame(({ camera }, delta) => {
    const m = mat.current;
    if (!m || !mesh.current) return;
    const cam = camera as THREE.PerspectiveCamera;
    const hy = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * DIST;
    m.uniforms.uHalf.value.set(hy * cam.aspect, hy);
    m.uniforms.uTime.value += Math.min(delta, 0.05);
    const o = curtainOpen(progress.current ?? 0);
    m.uniforms.uOpen.value = o;
    mesh.current.visible = o < 0.999;
  });

  return (
    <mesh
      ref={mesh}
      geometry={geometry}
      frustumCulled={false}
      renderOrder={20}
      onUpdate={(self) => self.layers.set(CURTAIN_LAYER)}
    >
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        vertexShader={vertex}
        fragmentShader={fragment}
        side={THREE.DoubleSide}
        // In the transparent queue so it draws after the hall's glows and glass.
        transparent
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * The two curtain halves, locked to the camera. Opens over the first beat of the
 * hero's scroll `progress` (0..1).
 * Mount after the component that moves the camera so it follows the same frame.
 */
export default function SilkCurtain({ progress }: { progress: RefObject<number> }) {
  const group = useRef<THREE.Group>(null);
  const camera = useThree((s) => s.camera);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    g.position.copy(camera.position);
    g.quaternion.copy(camera.quaternion);
  });

  return (
    <group ref={group}>
      <group position={[0, 0, -DIST]}>
        <Half side={-1} progress={progress} />
        <Half side={1} progress={progress} />
      </group>
    </group>
  );
}
