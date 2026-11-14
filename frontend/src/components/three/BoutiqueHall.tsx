"use client";
// The procedural boutique hallway: polished cream marble floor (with a soft
// reflector on desktop), ivory walls cut with tall Mughal arched alcoves holding
// shelves of jewel-toned fabric bolts (instanced), gold trim and cove lights,
// chandeliers with glow halos, a wine runner, and at the far end a big arch over
// a backlit jaali with a blush velvet camelback sofa, lamps and a rug.
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { MeshReflectorMaterial, RoundedBox } from "@react-three/drei";
import { HALL, SOFA } from "./boutiqueLayout";
import { glowTexture, jaaliTexture, marbleTexture, rng, rugTexture, shadowTexture } from "./boutiqueTextures";

const GOLD = "#c9a24a";
const IVORY = "#e2cdb4";
const ALCOVE_BACK = "#6e1a36";
/** Jewel tones for the folded fabric bolts. */
const BOLTS = ["#9d1747", "#c2185b", "#0f6b5a", "#1d4e89", "#b8860b", "#6a1b9a", "#e8c1ad", "#7b1e1e", "#d4a017", "#2e7d32", "#f3e3d3", "#ad1457", "#e3187d"];
const rngColor = (r: () => number) => BOLTS[Math.floor(r() * BOLTS.length)];

/** Pointed (Mughal) arch outline into a path, from `base` up to the `peak`. */
function arch(p: THREE.Path, cx: number, w: number, spring: number, peak: number, base: number) {
  const h = peak - spring;
  p.moveTo(cx - w / 2, base);
  p.lineTo(cx - w / 2, spring);
  p.bezierCurveTo(cx - w / 2, spring + h * 0.62, cx - w * 0.14, peak - h * 0.2, cx, peak);
  p.bezierCurveTo(cx + w * 0.14, peak - h * 0.2, cx + w / 2, spring + h * 0.62, cx + w / 2, spring);
  p.lineTo(cx + w / 2, base);
  p.closePath();
}

/** A gold band that follows an arch's outline. */
function archRing(w: number, spring: number, peak: number, t = 0.09) {
  const s = new THREE.Shape();
  arch(s, 0, w + t * 2, spring, peak + t * 1.4, 0);
  const hole = new THREE.Path();
  arch(hole, 0, w, spring, peak, 0.001);
  s.holes.push(hole);
  return new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: false, curveSegments: 20 });
}

type Arch = { u: number; w: number; spring: number; peak: number };

/** Wall slab (u along the wall, v up) with arched openings, extruded to show the reveals. */
function wallGeometry(u0: number, u1: number, arches: Arch[], depth: number) {
  const s = new THREE.Shape();
  s.moveTo(u0, -0.05);
  s.lineTo(u1, -0.05);
  s.lineTo(u1, HALL.height);
  s.lineTo(u0, HALL.height);
  s.closePath();
  for (const a of arches) {
    const h = new THREE.Path();
    arch(h, a.u, a.w, a.spring, a.peak, 0);
    s.holes.push(h);
  }
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 20 });
}

const ALCOVE = { w: 1.6, spring: 2.75, peak: 3.55 };
const DOOR = { w: 1.4, spring: 2.5, peak: 3.25 };

function SideWall({ side, materials }: { side: -1 | 1; materials: Mats }) {
  // Left wall (side -1) is rotated so local u maps to world -z; right wall to +z.
  const sign = side === -1 ? -1 : 1;
  const arches: Arch[] = [
    ...HALL.alcoves.map((z) => ({ u: sign * z, ...ALCOVE })),
    { u: sign * HALL.doorZ, ...DOOR },
  ];
  const geo = useMemo(() => {
    const a = sign * HALL.endZ;
    const b = sign * HALL.entranceZ;
    return wallGeometry(Math.min(a, b), Math.max(a, b), arches, HALL.wallDepth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sign]);
  const ringA = useMemo(() => archRing(ALCOVE.w, ALCOVE.spring, ALCOVE.peak), []);
  const ringD = useMemo(() => archRing(DOOR.w, DOOR.spring, DOOR.peak), []);
  const x = side * (HALL.halfWidth + HALL.wallDepth);
  const face = side * HALL.halfWidth;
  const rotY = side === -1 ? Math.PI / 2 : -Math.PI / 2;

  return (
    <group>
      <mesh geometry={geo} material={materials.wall} position={[x, 0, 0]} rotation={[0, rotY, 0]} />
      {/* Gold arch trims, just proud of the wall face. */}
      {HALL.alcoves.map((z) => (
        <mesh
          key={z}
          geometry={ringA}
          material={materials.gold}
          position={[face - side * 0.02, 0, z]}
          rotation={[0, -side * (Math.PI / 2), 0]}
        />
      ))}
      <mesh
        geometry={ringD}
        material={materials.gold}
        position={[face - side * 0.02, 0, HALL.doorZ]}
        rotation={[0, -side * (Math.PI / 2), 0]}
      />
      {/* Alcove backs (deep rose plaster) and the glowing doorway. */}
      {HALL.alcoves.map((z) => (
        <mesh key={`b${z}`} position={[x + side * 0.01, 1.8, z]} rotation={[0, -side * (Math.PI / 2), 0]} material={materials.alcove}>
          <planeGeometry args={[ALCOVE.w + 0.1, 3.6]} />
        </mesh>
      ))}
      <mesh position={[x + side * 0.01, 1.7, HALL.doorZ]} rotation={[0, -side * (Math.PI / 2), 0]} material={materials.doorGlow}>
        <planeGeometry args={[DOOR.w + 0.1, 3.4]} />
      </mesh>
      {/* Skirting and cornice. */}
      <mesh position={[face - side * 0.03, 0.08, (HALL.entranceZ + HALL.endZ) / 2]} material={materials.gold}>
        <boxGeometry args={[0.06, 0.16, HALL.entranceZ - HALL.endZ]} />
      </mesh>
      <mesh position={[face - side * 0.05, 4.35, (HALL.entranceZ + HALL.endZ) / 2]} material={materials.gold}>
        <boxGeometry args={[0.1, 0.12, HALL.entranceZ - HALL.endZ]} />
      </mesh>
    </group>
  );
}

/** Shelves and folded fabric bolts in every alcove (two instanced meshes). */
function Shelves({ mobile, materials }: { mobile: boolean; materials: Mats }) {
  const bolts = useRef<THREE.InstancedMesh>(null);
  const boards = useRef<THREE.InstancedMesh>(null);
  const levels = mobile ? 4 : 6;
  const perShelf = mobile ? 5 : 7;
  const stack = mobile ? 1 : 2;
  const boltCount = 2 * HALL.alcoves.length * levels * perShelf * stack;
  const boardCount = 2 * HALL.alcoves.length * levels;

  useLayoutEffect(() => {
    const b = bolts.current;
    const s = boards.current;
    if (!b || !s) return;
    const r = rng(11);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    const col = new THREE.Color();
    let bi = 0;
    let si = 0;
    for (const side of [-1, 1] as const) {
      const inner = side * (HALL.halfWidth + 0.06);
      const back = side * (HALL.halfWidth + HALL.wallDepth - 0.02);
      const cx = (inner + back) / 2;
      const depth = Math.abs(back - inner);
      for (const z of HALL.alcoves) {
        for (let l = 0; l < levels; l++) {
          const y = 0.35 + (l * 2.25) / (levels - 1);
          pos.set(cx, y, z);
          scl.set(depth, 0.035, ALCOVE.w - 0.06);
          m.compose(pos, q.identity(), scl);
          s.setMatrixAt(si++, m);
          const slot = (ALCOVE.w - 0.16) / perShelf;
          for (let k = 0; k < perShelf; k++) {
            for (let h = 0; h < stack; h++) {
              const bh = 0.11 + r() * 0.04;
              // The top shelf carries a single row.
              const empty = l === levels - 1 && h > 0;
              pos.set(cx + side * (r() - 0.5) * 0.04, y + 0.02 + bh / 2 + h * (bh + 0.005), z - (ALCOVE.w - 0.16) / 2 + slot * (k + 0.5));
              scl.set(empty ? 0.0001 : depth * (0.82 + r() * 0.1), bh, slot * (0.86 + r() * 0.08));
              m.compose(pos, q.identity(), scl);
              b.setMatrixAt(bi, m);
              b.setColorAt(bi, col.set(rngColor(r)));
              bi++;
            }
          }
        }
      }
    }
    b.instanceMatrix.needsUpdate = true;
    if (b.instanceColor) b.instanceColor.needsUpdate = true;
    s.instanceMatrix.needsUpdate = true;
  }, [levels, perShelf, stack]);

  return (
    <>
      <instancedMesh ref={bolts} args={[undefined, undefined, boltCount]} key={`b${boltCount}`}>
        <boxGeometry />
        <meshStandardMaterial roughness={0.72} color="#ffffff" />
      </instancedMesh>
      <instancedMesh ref={boards} args={[undefined, undefined, boardCount]} material={materials.wood} key={`s${boardCount}`}>
        <boxGeometry />
      </instancedMesh>
    </>
  );
}

function Chandelier({ z, materials, glow }: { z: number; materials: Mats; glow: THREE.Texture }) {
  const candles = useMemo(() => Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2), []);
  const y = 4.2;
  return (
    <group position={[0, y, z]}>
      <mesh position={[0, (HALL.height - y) / 2, 0]} material={materials.gold}>
        <cylinderGeometry args={[0.015, 0.015, HALL.height - y, 6]} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={materials.gold}>
        <torusGeometry args={[0.46, 0.022, 8, 40]} />
      </mesh>
      <mesh position={[0, 0.28, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.gold}>
        <torusGeometry args={[0.28, 0.018, 8, 32]} />
      </mesh>
      <mesh position={[0, -0.28, 0]} material={materials.crystal}>
        <coneGeometry args={[0.2, 0.5, 12, 1, true]} />
      </mesh>
      {candles.map((a) => (
        <mesh key={a} position={[Math.cos(a) * 0.46, 0.07, Math.sin(a) * 0.46]} material={materials.flame}>
          <sphereGeometry args={[0.04, 10, 8]} />
        </mesh>
      ))}
      <sprite scale={[2.6, 2.6, 1]}>
        <spriteMaterial map={glow} color="#ffb96a" transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <sprite scale={[0.9, 0.9, 1]}>
        <spriteMaterial map={glow} color="#fff0d0" transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </group>
  );
}

function Lamp({ x, materials, glow }: { x: number; materials: Mats; glow: THREE.Texture }) {
  return (
    <group position={[x, 0, -1.15]}>
      <mesh position={[0, 0.02, 0]} material={materials.gold}>
        <cylinderGeometry args={[0.16, 0.18, 0.04, 20]} />
      </mesh>
      <mesh position={[0, 0.8, 0]} material={materials.gold}>
        <cylinderGeometry args={[0.018, 0.018, 1.6, 8]} />
      </mesh>
      <mesh position={[0, 1.68, 0]} material={materials.shade}>
        <cylinderGeometry args={[0.16, 0.24, 0.3, 24, 1, true]} />
      </mesh>
      <sprite position={[0, 1.66, 0.05]} scale={[1.3, 1.3, 1]}>
        <spriteMaterial map={glow} color="#ffc27a" transparent opacity={0.6} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </group>
  );
}

/** Blush velvet camelback sofa with rolled arms, cushions and gold legs. */
function Sofa({ materials, shadow }: { materials: Mats; shadow: THREE.Texture }) {
  const back = useMemo(() => {
    const w = SOFA.width / 2;
    const s = new THREE.Shape();
    s.moveTo(-w, 0);
    s.lineTo(w, 0);
    s.lineTo(w, 0.5);
    s.bezierCurveTo(w - 0.1, 0.62, 0.75, 0.66, 0.42, 0.78);
    s.bezierCurveTo(0.2, 0.86, -0.2, 0.86, -0.42, 0.78);
    s.bezierCurveTo(-0.75, 0.66, -w + 0.1, 0.62, -w, 0.5);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, {
      depth: 0.16,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 4,
      curveSegments: 24,
    });
    return g;
  }, []);
  const depth = SOFA.seatFrontZ - SOFA.backZ;
  const cz = (SOFA.seatFrontZ + SOFA.backZ) / 2;
  const baseTop = SOFA.seatY - 0.13;
  return (
    <group>
      {/* Soft contact shadow under the whole sofa. */}
      <mesh position={[0, 0.008, cz + 0.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.4, 1.5]} />
        <meshBasicMaterial map={shadow} transparent depthWrite={false} opacity={0.85} />
      </mesh>
      {/* Gold legs. */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * (SOFA.width / 2 - 0.12), 0.05, cz + sz * (depth / 2 - 0.08)]} material={materials.gold}>
            <cylinderGeometry args={[0.035, 0.025, 0.1, 10]} />
          </mesh>
        )),
      )}
      {/* Plinth. */}
      <RoundedBox args={[SOFA.width, baseTop - 0.1, depth]} radius={0.05} smoothness={3} position={[0, 0.1 + (baseTop - 0.1) / 2, cz]} material={materials.velvet} />
      {/* Gold piping along the front of the plinth. */}
      <mesh position={[0, 0.13, SOFA.seatFrontZ + 0.005]} material={materials.gold}>
        <boxGeometry args={[SOFA.width - 0.1, 0.025, 0.02]} />
      </mesh>
      {/* Seat cushion. */}
      <RoundedBox
        args={[SOFA.width - 0.44, 0.15, depth - 0.2]}
        radius={0.06}
        smoothness={4}
        position={[0, SOFA.seatY - 0.075, SOFA.seatFrontZ - (depth - 0.2) / 2 - 0.01]}
        material={materials.velvetLight}
      />
      {/* Camelback. */}
      <mesh geometry={back} material={materials.velvet} position={[0, baseTop - 0.02, SOFA.backZ]} />
      {/* Rolled arms. */}
      {[-1, 1].map((sx) => (
        <group key={sx} position={[sx * (SOFA.width / 2 - 0.12), 0, cz]}>
          <RoundedBox args={[0.24, 0.38, depth]} radius={0.05} smoothness={3} position={[0, baseTop + 0.15, 0]} material={materials.velvet} />
          <mesh position={[sx * 0.02, baseTop + 0.36, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.velvet}>
            <cylinderGeometry args={[0.15, 0.15, depth, 24]} />
          </mesh>
          <mesh position={[sx * 0.02, baseTop + 0.36, depth / 2 + 0.002]} material={materials.gold}>
            <circleGeometry args={[0.07, 24]} />
          </mesh>
        </group>
      ))}
      {/* Back cushions. */}
      {[-1, 1].map((sx) => (
        <RoundedBox
          key={`c${sx}`}
          args={[0.5, 0.42, 0.14]}
          radius={0.07}
          smoothness={4}
          position={[sx * 0.82, SOFA.seatY + 0.24, SOFA.backZ + 0.32]}
          rotation={[-0.22, sx * -0.12, 0]}
          material={materials.cushion}
        />
      ))}
    </group>
  );
}

type Mats = ReturnType<typeof makeMaterials>;

function makeMaterials(marble: THREE.Texture, jaali: THREE.Texture) {
  return {
    wall: new THREE.MeshStandardMaterial({ color: IVORY, roughness: 0.85 }),
    alcove: new THREE.MeshStandardMaterial({ color: ALCOVE_BACK, roughness: 0.9 }),
    doorGlow: new THREE.MeshStandardMaterial({ color: "#3a1420", emissive: "#f2b373", emissiveIntensity: 0.95, roughness: 1 }),
    gold: new THREE.MeshStandardMaterial({ color: GOLD, metalness: 0.75, roughness: 0.32, emissive: "#3a2508", emissiveIntensity: 0.4 }),
    wood: new THREE.MeshStandardMaterial({ color: "#7a4a24", roughness: 0.6, metalness: 0.1 }),
    crystal: new THREE.MeshStandardMaterial({ color: "#fff4dc", emissive: "#ffcf8a", emissiveIntensity: 0.9, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
    flame: new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffd9a0").multiplyScalar(3), toneMapped: false }),
    shade: new THREE.MeshStandardMaterial({ color: "#f6e6cf", emissive: "#ffb766", emissiveIntensity: 1.2, side: THREE.DoubleSide }),
    cove: new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffcf8f").multiplyScalar(2.2), toneMapped: false }),
    ceiling: new THREE.MeshStandardMaterial({ color: "#3d2318", roughness: 0.9 }),
    velvet: new THREE.MeshPhysicalMaterial({ color: "#f0cdd4", roughness: 0.92, sheen: 1, sheenRoughness: 0.45, sheenColor: new THREE.Color("#fff0f4") }),
    velvetLight: new THREE.MeshPhysicalMaterial({ color: "#f6dce1", roughness: 0.9, sheen: 1, sheenRoughness: 0.4, sheenColor: new THREE.Color("#ffffff") }),
    cushion: new THREE.MeshPhysicalMaterial({ color: "#d9a441", roughness: 0.55, metalness: 0.2, sheen: 1, sheenColor: new THREE.Color("#ffe7a8") }),
    floorPlain: new THREE.MeshStandardMaterial({ map: marble, roughness: 0.28, metalness: 0.05 }),
    jaali: new THREE.MeshStandardMaterial({ color: "#000000", emissive: "#ffffff", emissiveMap: jaali, emissiveIntensity: 1.1 }),
  };
}

export default function BoutiqueHall({ mobile }: { mobile: boolean }) {
  const tex = useMemo(() => {
    const marble = marbleTexture(mobile ? 512 : 1024);
    marble.repeat.set(3, 9);
    const runner = rugTexture(256, 1024, true);
    runner.repeat.set(1, 6);
    return {
      marble,
      runner,
      rug: rugTexture(512, 768),
      jaali: jaaliTexture(),
      glow: glowTexture(),
      shadow: shadowTexture(),
    };
  }, [mobile]);
  const mats = useMemo(() => makeMaterials(tex.marble, tex.jaali), [tex]);
  const backWall = useMemo(
    () =>
      wallGeometry(-HALL.halfWidth - 0.01, HALL.halfWidth + 0.01, [{ u: 0, w: 3.6, spring: 2.7, peak: 4.4 }], 0.45),
    [],
  );
  const bigRing = useMemo(() => archRing(3.6, 2.7, 4.4, 0.14), []);
  const len = HALL.entranceZ - HALL.endZ;
  const midZ = (HALL.entranceZ + HALL.endZ) / 2;

  return (
    <group>
      {/* Floor. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, midZ]} material={mobile ? mats.floorPlain : undefined}>
        <planeGeometry args={[HALL.halfWidth * 2 + 0.2, len]} />
        {!mobile && (
          <MeshReflectorMaterial
            map={tex.marble}
            resolution={384}
            blur={[240, 70]}
            mixBlur={1}
            mixStrength={1.6}
            mixContrast={1}
            mirror={0.6}
            depthScale={0.9}
            minDepthThreshold={0.3}
            maxDepthThreshold={1.4}
            roughness={0.42}
            metalness={0.08}
            color="#ffffff"
          />
        )}
      </mesh>
      {/* Runner down the hall and the rug at the sofa. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, (HALL.entranceZ + 1.6) / 2]}>
        <planeGeometry args={[1.3, HALL.entranceZ - 1.6]} />
        <meshStandardMaterial map={tex.runner} roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0.15]}>
        <planeGeometry args={[3.6, 2.4]} />
        <meshStandardMaterial map={tex.rug} roughness={0.95} />
      </mesh>

      {/* Ceiling and cove light strips. */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, HALL.height, midZ]} material={mats.ceiling}>
        <planeGeometry args={[HALL.halfWidth * 2 + 0.2, len]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 2.4, HALL.height - 0.02, midZ]} material={mats.cove}>
          <boxGeometry args={[0.07, 0.02, len]} />
        </mesh>
      ))}

      <SideWall side={-1} materials={mats} />
      <SideWall side={1} materials={mats} />
      <Shelves mobile={mobile} materials={mats} />

      {/* Back wall with the big arch, a backlit jaali screen behind it. */}
      <mesh geometry={backWall} material={mats.wall} position={[0, 0, HALL.endZ - 0.45]} />
      <mesh geometry={bigRing} material={mats.gold} position={[0, 0, HALL.endZ + 0.005]} />
      <mesh position={[0, 2.2, HALL.endZ - 0.5]} material={mats.jaali}>
        <planeGeometry args={[3.8, 4.6]} />
      </mesh>

      {HALL.chandeliers.map((z) => (
        <Chandelier key={z} z={z} materials={mats} glow={tex.glow} />
      ))}
      <Lamp x={-1.85} materials={mats} glow={tex.glow} />
      <Lamp x={1.85} materials={mats} glow={tex.glow} />
      <Sofa materials={mats} shadow={tex.shadow} />
    </group>
  );
}
