"use client";
// The end of the hero journey: a backlit walk-in wardrobe set into the big end
// arch (after the owner's closet references). Three bays: the outer two have a
// top shelf of handbags under an LED strip, a bronze rail of garments hung
// sideways and wooden drawers; the centre bay has black-framed glass doors that
// swing open as the camera arrives, revealing three gowns facing front. The
// garments are the product hanger cut-outs (transparent PNG/WebP), so the
// client's pieces fill it. A bench and rug sit in front.
import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { BEATS, WARDROBE, easeInOut, remap } from "./boutiqueLayout";
import { surface } from "./boutiqueMaterials";
import { rugTexture } from "./boutiqueTextures";

const W = WARDROBE.width;
const H = WARDROBE.height;
const D = WARDROBE.depth;
const C = WARDROBE.centre / 2;
const T = 0.03; // panel thickness
const SIDE_BAYS = [
  [-W / 2, -C],
  [C, W / 2],
] as const;

type Hang = { url: string; x: number; y: number; z: number; h: number; rot: number; dim: boolean };

/** Where each garment hangs: three facing front in the centre bay, the rest sideways on the side rails. */
function hangPlan(urls: string[]): Hang[] {
  if (!urls.length) return [];
  const at = (i: number) => urls[i % urls.length];
  const plan: Hang[] = [
    { url: at(1), x: -0.27, y: 2.12, z: -D + 0.2, h: 1.7, rot: 0.32, dim: true },
    { url: at(2), x: 0.27, y: 2.12, z: -D + 0.2, h: 1.7, rot: -0.32, dim: true },
    { url: at(0), x: 0, y: 2.14, z: -D + 0.3, h: 1.86, rot: 0, dim: false },
  ];
  let k = 3;
  SIDE_BAYS.forEach(([x0, x1], b) => {
    const n = 5;
    for (let i = 0; i < n; i++) {
      const x = x0 + 0.2 + (i * (x1 - x0 - 0.4)) / (n - 1);
      // Hung sideways like a real closet, all turned toward the centre.
      plan.push({ url: at(k++), x, y: 1.97, z: -D / 2, h: 1.1, rot: b === 0 ? 1.2 : -1.2, dim: true });
    }
  });
  return plan;
}

function Garment({ g, tex, index }: { g: Hang; tex: THREE.Texture; index: number }) {
  const ref = useRef<THREE.Group>(null);
  const img = tex.image as { width?: number; height?: number } | undefined;
  const aspect = img?.width && img?.height ? img.width / img.height : 0.75;
  const w = g.h * aspect;
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, color: g.dim ? "#dcd6cf" : "#ffffff" }),
    [tex, g.dim],
  );
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.6 + index * 1.7) * 0.012;
  });
  return (
    <group position={[g.x, g.y, g.z]} rotation={[0, g.rot, 0]}>
      <group ref={ref}>
        <mesh position={[0, -g.h / 2, 0]} material={mat}>
          <planeGeometry args={[w, g.h]} />
        </mesh>
      </group>
    </group>
  );
}

function Garments({ urls }: { urls: string[] }) {
  const plan = useMemo(() => hangPlan(urls), [urls]);
  const unique = useMemo(() => [...new Set(plan.map((g) => g.url))], [plan]);
  // Colour space is set in the loader callback (textures from the hook are read-only here).
  const texs = useTexture(unique, (loaded) => {
    for (const t of Array.isArray(loaded) ? loaded : [loaded]) {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
    }
  });
  const byUrl = useMemo(() => new Map(unique.map((u, i) => [u, texs[i]] as const)), [unique, texs]);
  return (
    <>
      {plan.map((g, i) => (
        <Garment key={i} g={g} tex={byUrl.get(g.url)!} index={i} />
      ))}
    </>
  );
}

/** One glass door (black frame + glass), hinged on its outer edge; `dir` 1 = left door (opens to the left). */
function Door({ dir, frame, glass, progress }: { dir: 1 | -1; frame: THREE.Material; glass: THREE.Material; progress: RefObject<number> }) {
  const pivot = useRef<THREE.Group>(null);
  const dw = C - 0.01;
  const dh = H - 0.1;
  useFrame(() => {
    const open = easeInOut(remap(progress.current ?? 0, BEATS.doors[0], BEATS.doors[1]));
    if (pivot.current) pivot.current.rotation.y = -dir * open * 1.75;
  });
  const cx = (dir * dw) / 2;
  const bar = 0.03;
  return (
    <group ref={pivot} position={[-dir * C, 0.05, 0.02]}>
      {[
        [cx, dh - bar / 2, dw, bar],
        [cx, bar / 2, dw, bar],
        [dir * bar / 2, dh / 2, bar, dh],
        [dir * (dw - bar / 2), dh / 2, bar, dh],
      ].map(([x, y, w, h], i) => (
        <mesh key={i} position={[x, y, 0]} material={frame}>
          <boxGeometry args={[w, h, 0.03]} />
        </mesh>
      ))}
      <mesh position={[cx, dh / 2, 0]} material={glass}>
        <planeGeometry args={[dw - bar, dh - bar]} />
      </mesh>
    </group>
  );
}

export default function BoutiqueWardrobe({
  urls,
  rich,
  progress,
}: {
  urls: string[];
  rich: boolean;
  progress: RefObject<number>;
}) {
  const m = useMemo(
    () => ({
      white: surface(rich, { color: "#f1eee9", roughness: 0.55 }),
      wood: surface(rich, { color: "#8d6a50", roughness: 0.7 }),
      drawer: surface(rich, { color: "#9a7a62", roughness: 0.6 }),
      bronze: surface(rich, { color: "#6b4a35", metalness: 1, roughness: 0.35 }),
      black: surface(rich, { color: "#1b1715", metalness: 0.6, roughness: 0.4 }),
      glass: surface(rich, { color: "#e9f2ef", roughness: 0.05, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }),
      // Backlit panels and LED strips: unlit so they glow (bloom picks them up on medium/high).
      backlit: new THREE.MeshBasicMaterial({ color: "#fff1dc" }),
      led: new THREE.MeshBasicMaterial({ color: "#fff8ea", toneMapped: false }),
      seat: surface(rich, { color: "#cdbfae", roughness: 0.95 }),
      darkWood: surface(rich, { color: "#2a1d17", roughness: 0.6 }),
      rug: surface(rich, { map: rugTexture(768, 512), roughness: 0.95 }),
      bags: ["#e8781e", "#8b3fb0", "#f4f1ec", "#151215", "#c98a5a"].map((c) => surface(rich, { color: c, roughness: 0.45 })),
    }),
    [rich],
  );

  const panel = (x: number, y: number, z: number, w: number, h: number, d: number, mat: THREE.Material, key: string) => (
    <mesh key={key} position={[x, y, z]} material={mat}>
      <boxGeometry args={[w, h, d]} />
    </mesh>
  );

  return (
    <group>
      <group position={[0, 0, WARDROBE.frontZ]}>
        {/* Carcass: uprights, top, plinth. */}
        {[-W / 2, -C, C, W / 2].map((x) => panel(x, H / 2, -D / 2, T, H, D, m.white, `u${x}`))}
        {panel(0, H - T / 2, -D / 2, W + T, T, D, m.white, "top")}
        {panel(0, 0.04, -D / 2, W + T, 0.08, D, m.white, "plinth")}
        {/* Backs: warm wood behind the side rails, a glowing panel behind the gowns. */}
        {SIDE_BAYS.map(([x0, x1]) => panel((x0 + x1) / 2, H / 2, -D + 0.01, x1 - x0, H, 0.02, m.wood, `b${x0}`))}
        {panel(0, H / 2, -D + 0.01, C * 2, H, 0.02, m.backlit, "bc")}

        {/* Side bays: top shelf with bags under an LED strip, bronze rail, shelf, drawers. */}
        {SIDE_BAYS.map(([x0, x1], b) => {
          const cx = (x0 + x1) / 2;
          const w = x1 - x0 - T;
          return (
            <group key={`bay${b}`}>
              {panel(cx, 2.06, -D / 2, w, 0.03, D, m.white, "s1")}
              {panel(cx, 2.04, -0.03, w, 0.008, 0.02, m.led, "led1")}
              {panel(cx, 0.7, -D / 2, w, 0.03, D, m.white, "s2")}
              {panel(cx, 0.68, -0.03, w, 0.008, 0.02, m.led, "led2")}
              <mesh position={[cx, 1.97, -D / 2]} rotation={[0, 0, Math.PI / 2]} material={m.bronze}>
                <cylinderGeometry args={[0.012, 0.012, w, 10]} />
              </mesh>
              {[0.2, 0.42].map((y) => panel(cx, y + 0.1, -0.02, w - 0.04, 0.19, 0.03, m.drawer, `d${y}`))}
              {[0.2, 0.42].map((y) => panel(cx, y + 0.17, 0.0, w * 0.3, 0.012, 0.012, m.bronze, `h${y}`))}
              {/* Handbags on the top shelf. */}
              {[0, 1].map((k) => {
                const bx = cx + (k ? 0.24 : -0.22);
                const mat = m.bags[(b * 2 + k) % m.bags.length];
                return (
                  <group key={`bag${k}`} position={[bx, 2.075, -D / 2]}>
                    <RoundedBox args={[0.3, 0.2, 0.14]} radius={0.03} smoothness={2} position={[0, 0.1, 0]} material={mat} />
                    <mesh position={[0, 0.22, 0]} material={mat}>
                      <torusGeometry args={[0.07, 0.008, 6, 16, Math.PI]} />
                    </mesh>
                  </group>
                );
              })}
            </group>
          );
        })}

        {/* Centre bay: shelf with a clutch, rail, LED uprights, glass doors. */}
        {panel(0, 2.18, -D / 2, C * 2 - T, 0.03, D, m.white, "cs")}
        {panel(0, 2.16, -0.03, C * 2 - T, 0.008, 0.02, m.led, "cled")}
        <mesh position={[0, 2.14, -D + 0.3]} rotation={[0, 0, Math.PI / 2]} material={m.bronze}>
          <cylinderGeometry args={[0.012, 0.012, C * 2 - T, 10]} />
        </mesh>
        <RoundedBox args={[0.26, 0.1, 0.12]} radius={0.03} smoothness={2} position={[0.1, 2.25, -D / 2]} material={m.bags[3]} />
        {[-C + 0.03, C - 0.03].map((x) => panel(x, H / 2, -0.04, 0.01, H - 0.2, 0.01, m.led, `v${x}`))}
        <Garments urls={urls} />
        <Door dir={1} frame={m.black} glass={m.glass} progress={progress} />
        <Door dir={-1} frame={m.black} glass={m.glass} progress={progress} />
      </group>

      {/* Rug and bench in front of the wardrobe. */}
      <group position={[0, 0, WARDROBE.frontZ + 1.25]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} material={m.rug}>
          <planeGeometry args={[3.2, 2.1]} />
        </mesh>
        <RoundedBox args={[0.95, 0.14, 0.52]} radius={0.04} smoothness={3} position={[-0.32, 0.43, 0]} material={m.seat} />
        <RoundedBox args={[0.8, 0.07, 0.52]} radius={0.03} smoothness={3} position={[0.52, 0.4, 0]} material={m.darkWood} />
        <mesh position={[-0.62, 0.18, 0]} material={m.darkWood}>
          <boxGeometry args={[0.12, 0.36, 0.42]} />
        </mesh>
        <mesh position={[0.62, 0.19, 0]} material={m.darkWood}>
          <sphereGeometry args={[0.2, 20, 14]} />
        </mesh>
      </group>
    </group>
  );
}
