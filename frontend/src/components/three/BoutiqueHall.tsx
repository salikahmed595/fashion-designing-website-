"use client";
// The boutique architecture: deep-teal lacquered walls cut with scalloped
// Mughal niches (brass bead mouldings, baked AO, warm wall-wash light pools),
// picture-frame wainscot on the pilasters, brass skirting and cornice, a
// coffered ceiling with recessed downlights and brass track spots, glass
// pendant lanterns and a crystal chandelier, polished white marble with a real
// (blurred) reflection and brass inlay lines, a kilim runner, side doorways
// glowing from the fitting rooms, and the big scalloped arch with a backlit
// jaali at the far end. Garments and furniture live in their own components.
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { MeshReflectorMaterial } from "@react-three/drei";
import { HALL } from "./boutiqueLayout";
import { beadGeometry, frameGeometry, wallGeometry, type ArchSpec } from "./boutiqueShapes";
import {
  aoStripTexture,
  glowTexture,
  jaaliTexture,
  marbleTexture,
  nicheBackTexture,
  rng,
  rugTexture,
  washTexture,
} from "./boutiqueTextures";

const NICHE: ArchSpec = { ...HALL.niche };
const DOOR: ArchSpec = { w: HALL.door.w, base: 0, spring: HALL.door.spring, peak: HALL.door.peak, lobes: 5 };
const END: ArchSpec = { w: 3.3, base: 0, spring: 2.55, peak: 3.55, lobes: 9, depth: 0.11 };
const LEN = HALL.entranceZ - HALL.endZ;
const MID_Z = (HALL.entranceZ + HALL.endZ) / 2;
/** Pilaster centres between niches (for wainscot frames and track spot aim). */
const PILASTERS = [13.8, 11.0, 8.2, 5.4, 2.1];

export function makeHallMaterials() {
  return {
    wall: new THREE.MeshPhysicalMaterial({ color: "#0f4c48", roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.28 }),
    moulding: new THREE.MeshPhysicalMaterial({ color: "#16625c", roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.25 }),
    brass: new THREE.MeshStandardMaterial({ color: "#d4ac58", metalness: 1, roughness: 0.28 }),
    brushed: new THREE.MeshStandardMaterial({ color: "#c79f4e", metalness: 1, roughness: 0.42 }),
    black: new THREE.MeshStandardMaterial({ color: "#151515", metalness: 0.6, roughness: 0.45 }),
    ceiling: new THREE.MeshStandardMaterial({ color: "#0b3936", roughness: 0.85 }),
    bulb: new THREE.MeshBasicMaterial({ color: new THREE.Color("#fff1d6").multiplyScalar(6), toneMapped: false }),
    lens: new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffe6bf").multiplyScalar(3.5), toneMapped: false }),
    glass: new THREE.MeshPhysicalMaterial({
      color: "#fff3df",
      roughness: 0.06,
      metalness: 0,
      transparent: true,
      opacity: 0.32,
      clearcoat: 1,
      emissive: "#ffcf8f",
      emissiveIntensity: 0.25,
      depthWrite: false,
    }),
    crystal: new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      roughness: 0.02,
      metalness: 0.1,
      clearcoat: 1,
      emissive: "#ffe8c0",
      emissiveIntensity: 0.6,
      envMapIntensity: 2.5,
    }),
  };
}
type Mats = ReturnType<typeof makeHallMaterials>;

/** One side wall: slab with niches + doorway, niche backs, washes, beads, frames, skirting, cornice. */
function SideWall({ side, m, tex }: { side: -1 | 1; m: Mats; tex: Tex }) {
  const sign = side === -1 ? -1 : 1;
  const geo = useMemo(() => {
    const a = sign * HALL.endZ;
    const b = sign * HALL.entranceZ;
    const holes = [
      ...HALL.niches.map((z) => ({ u: sign * z, arch: NICHE })),
      { u: sign * HALL.doorZ, arch: DOOR },
    ];
    return wallGeometry(Math.min(a, b), Math.max(a, b), HALL.height, holes, HALL.wallDepth);
  }, [sign]);
  const x = side * (HALL.halfWidth + HALL.wallDepth);
  const face = side * HALL.halfWidth;
  const rotY = side === -1 ? Math.PI / 2 : -Math.PI / 2;
  const inward = -side * (Math.PI / 2); // plane normal pointing into the hall
  const nicheH = HALL.niche.peak + 0.15 - HALL.niche.base;

  return (
    <group>
      <mesh geometry={geo} material={m.wall} position={[x, 0, 0]} rotation={[0, rotY, 0]} receiveShadow />
      {HALL.niches.map((z) => (
        <group key={z}>
          {/* Niche back (baked AO) and the track spot's light pool on it. */}
          <mesh position={[x - side * 0.004, HALL.niche.base + nicheH / 2, z]} rotation={[0, inward, 0]} receiveShadow>
            <planeGeometry args={[HALL.niche.w + 0.2, nicheH]} />
            <meshStandardMaterial map={tex.nicheBack} roughness={0.75} />
          </mesh>
          <mesh position={[x - side * 0.012, HALL.niche.base + nicheH * 0.55, z]} rotation={[0, inward, 0]}>
            <planeGeometry args={[HALL.niche.w * 1.05, nicheH * 1.05]} />
            <meshBasicMaterial map={tex.wash} transparent opacity={0.42} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} />
          </mesh>
          {/* Brass rail. */}
          <mesh position={[side * (HALL.halfWidth + 0.32), 2.3, z]} rotation={[Math.PI / 2, 0, 0]} material={m.brushed} castShadow>
            <cylinderGeometry args={[0.014, 0.014, HALL.niche.w - 0.08, 8]} />
          </mesh>
          {/* Niche floor ledge. */}
          <mesh position={[side * (HALL.halfWidth + HALL.wallDepth / 2), HALL.niche.base + 0.01, z]} material={m.brass}>
            <boxGeometry args={[HALL.wallDepth, 0.02, HALL.niche.w]} />
          </mesh>
        </group>
      ))}
      {/* Fitting-room glow through the doorway. */}
      <mesh position={[x + side * 0.3, 1.6, HALL.doorZ]} rotation={[0, inward, 0]}>
        <planeGeometry args={[HALL.door.w + 0.4, 3.2]} />
        <meshStandardMaterial color="#1a0d0d" emissive="#f4c8a6" emissiveIntensity={1.1} />
      </mesh>
      {/* Skirting (split around the doorway) and cornice. */}
      {[
        [HALL.doorZ + HALL.door.w / 2 + 0.02, HALL.entranceZ],
        [HALL.endZ, HALL.doorZ - HALL.door.w / 2 - 0.02],
      ].map(([z0, z1]) => (
        <group key={z0}>
          <mesh position={[face - side * 0.025, 0.07, (z0 + z1) / 2]} material={m.moulding} receiveShadow>
            <boxGeometry args={[0.05, 0.14, z1 - z0]} />
          </mesh>
          <mesh position={[face - side * 0.052, 0.145, (z0 + z1) / 2]} material={m.brass}>
            <boxGeometry args={[0.012, 0.014, z1 - z0]} />
          </mesh>
        </group>
      ))}
      <mesh position={[face - side * 0.06, HALL.height - 0.1, MID_Z]} material={m.moulding}>
        <boxGeometry args={[0.12, 0.2, LEN]} />
      </mesh>
      <mesh position={[face - side * 0.125, HALL.height - 0.22, MID_Z]} material={m.brass}>
        <boxGeometry args={[0.015, 0.02, LEN]} />
      </mesh>
      {/* Brass dado line at niche-base height on the pilasters. */}
      <mesh position={[face - side * 0.01, HALL.niche.base - 0.02, MID_Z]} material={m.brass}>
        <boxGeometry args={[0.02, 0.018, LEN]} />
      </mesh>
    </group>
  );
}

/** Instanced bits shared by both walls: niche beads, wainscot frames, ceiling beams, downlights, track spots. */
function Instanced({ m }: { m: Mats }) {
  const beads = useRef<THREE.InstancedMesh>(null);
  const frames = useRef<THREE.InstancedMesh>(null);
  const beams = useRef<THREE.InstancedMesh>(null);
  const downs = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
  const lenses = useRef<THREE.InstancedMesh>(null);

  const bead = useMemo(() => beadGeometry(NICHE), []);
  const frame = useMemo(() => frameGeometry(), []);
  const beamZ = useMemo(() => {
    const out: number[] = [];
    for (let z = HALL.entranceZ - 0.7; z > HALL.endZ + 0.3; z -= 1.4) out.push(z);
    return out;
  }, []);
  const spotZ = useMemo(() => [12.4, 9.6, 6.8, 4.0, 1.4], []);
  const frameCount = PILASTERS.length * 2 * 2 + 4;

  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    const set = (mesh: THREE.InstancedMesh | null, i: number) => {
      o.updateMatrix();
      mesh?.setMatrixAt(i, o.matrix);
    };
    // Beads around each niche, flush with the wall face.
    let i = 0;
    for (const side of [-1, 1]) {
      for (const z of HALL.niches) {
        o.position.set(side * (HALL.halfWidth - 0.012), 0, z);
        o.rotation.set(0, -side * (Math.PI / 2), 0);
        o.scale.set(1, 1, 1);
        set(beads.current, i++);
      }
    }
    // Wainscot frames: lower and upper panel on every pilaster, and four on the end wall.
    i = 0;
    for (const side of [-1, 1]) {
      for (const z of PILASTERS) {
        for (const [y, h] of [
          [0.36, 1.05],
          [1.62, 1.95],
        ]) {
          o.position.set(side * (HALL.halfWidth - 0.008), y, z);
          o.rotation.set(0, -side * (Math.PI / 2), 0);
          o.scale.set(0.52, h, 1);
          set(frames.current, i++);
        }
      }
    }
    for (const x of [-2.35, 2.35]) {
      for (const [y, h] of [
        [0.36, 1.05],
        [1.62, 1.95],
      ]) {
        o.position.set(x, y, HALL.endZ + 0.008);
        o.rotation.set(0, 0, 0);
        o.scale.set(1.0, h, 1);
        set(frames.current, i++);
      }
    }
    // Ceiling beams (coffers) and recessed downlights between them.
    beamZ.forEach((z, k) => {
      o.position.set(0, HALL.height - 0.07, z);
      o.rotation.set(0, 0, 0);
      o.scale.set(1, 1, 1);
      set(beams.current, k);
      o.position.set(0, HALL.height - 0.004, z - 0.7);
      o.rotation.set(Math.PI / 2, 0, 0);
      set(downs.current, k);
    });
    // Track spot heads aimed at the niches.
    i = 0;
    for (const side of [-1, 1]) {
      for (const z of spotZ) {
        o.position.set(side * 1.75, HALL.height - 0.2, z + 0.4);
        o.rotation.set(0, 0, side * -0.75);
        o.scale.set(1, 1, 1);
        set(heads.current, i);
        // The lens sits at the head's lower end.
        const dir = new THREE.Vector3(0, -1, 0).applyEuler(o.rotation);
        o.position.addScaledVector(dir, 0.09);
        o.rotation.set(0, 0, 0);
        o.lookAt(o.position.clone().add(dir));
        set(lenses.current, i);
        i++;
      }
    }
    for (const mesh of [beads, frames, beams, downs, heads, lenses]) {
      if (mesh.current) mesh.current.instanceMatrix.needsUpdate = true;
    }
  }, [beamZ, spotZ]);

  return (
    <>
      <instancedMesh ref={beads} args={[bead, m.brass, HALL.niches.length * 2]} />
      <instancedMesh ref={frames} args={[frame, m.moulding, frameCount]} receiveShadow />
      <instancedMesh ref={beams} args={[undefined, m.moulding, beamZ.length]}>
        <boxGeometry args={[HALL.halfWidth * 2, 0.14, 0.14]} />
      </instancedMesh>
      <instancedMesh ref={downs} args={[undefined, m.bulb, beamZ.length]}>
        <circleGeometry args={[0.07, 20]} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, m.black, spotZ.length * 2]}>
        <cylinderGeometry args={[0.05, 0.045, 0.18, 14]} />
      </instancedMesh>
      <instancedMesh ref={lenses} args={[undefined, m.lens, spotZ.length * 2]}>
        <circleGeometry args={[0.038, 16]} />
      </instancedMesh>
    </>
  );
}

function Pendant({ z, m, glow }: { z: number; m: Mats; glow: THREE.Texture }) {
  const y = 2.95;
  return (
    <group position={[0, y, z]}>
      <mesh position={[0, (HALL.height - y) / 2 + 0.2, 0]} material={m.brass}>
        <cylinderGeometry args={[0.008, 0.008, HALL.height - y - 0.4, 6]} />
      </mesh>
      <mesh position={[0, 0.26, 0]} material={m.brass}>
        <cylinderGeometry args={[0.06, 0.12, 0.09, 20]} />
      </mesh>
      <mesh material={m.glass}>
        <sphereGeometry args={[0.22, 28, 20]} />
      </mesh>
      <mesh material={m.bulb}>
        <sphereGeometry args={[0.045, 12, 10]} />
      </mesh>
      <mesh position={[0, -0.23, 0]} material={m.brass}>
        <sphereGeometry args={[0.025, 10, 8]} />
      </mesh>
      <sprite scale={[1.4, 1.4, 1]}>
        <spriteMaterial map={glow} color="#ffc98a" transparent opacity={0.35} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </group>
  );
}

/** Crystal chandelier: three brass rings dripping instanced crystals, candle bulbs. */
function Chandelier({ m, glow, mobile }: { m: Mats; glow: THREE.Texture; mobile: boolean }) {
  const crystals = useRef<THREE.InstancedMesh>(null);
  const tiers = useMemo(() => [
    { r: 0.62, y: 0, n: mobile ? 18 : 30 },
    { r: 0.44, y: 0.26, n: mobile ? 14 : 22 },
    { r: 0.26, y: 0.5, n: mobile ? 10 : 14 },
  ], [mobile]);
  const count = tiers.reduce((a, t) => a + t.n * 2, 0) + 12;
  useLayoutEffect(() => {
    const mesh = crystals.current;
    if (!mesh) return;
    const r = rng(21);
    const o = new THREE.Object3D();
    let i = 0;
    for (const t of tiers) {
      for (let k = 0; k < t.n; k++) {
        const a = (k / t.n) * Math.PI * 2;
        for (let d = 0; d < 2; d++) {
          o.position.set(Math.cos(a) * t.r, t.y - 0.08 - d * 0.1 - r() * 0.04, Math.sin(a) * t.r);
          o.rotation.set(0, a, 0);
          o.scale.set(0.025, d ? 0.05 : 0.035, 0.025);
          o.updateMatrix();
          mesh.setMatrixAt(i++, o.matrix);
        }
      }
    }
    // Central cascade.
    for (let k = 0; k < 12; k++) {
      o.position.set(0, -0.15 - k * 0.06, 0);
      o.scale.set(0.05 - k * 0.003, 0.04, 0.05 - k * 0.003);
      o.updateMatrix();
      mesh.setMatrixAt(i++, o.matrix);
    }
    mesh.count = i;
    mesh.instanceMatrix.needsUpdate = true;
  }, [tiers]);
  return (
    <group position={[0, 3.0, HALL.chandelierZ]}>
      <mesh position={[0, 0.75, 0]} material={m.brass}>
        <cylinderGeometry args={[0.012, 0.012, 0.6, 6]} />
      </mesh>
      {tiers.map((t) => (
        <group key={t.r} position={[0, t.y, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={m.brass}>
            <torusGeometry args={[t.r, 0.014, 8, 48]} />
          </mesh>
          {Array.from({ length: 6 }, (_, k) => (
            <mesh key={k} position={[Math.cos((k / 6) * Math.PI * 2) * t.r, 0.06, Math.sin((k / 6) * Math.PI * 2) * t.r]} material={m.bulb}>
              <sphereGeometry args={[0.022, 8, 6]} />
            </mesh>
          ))}
        </group>
      ))}
      <instancedMesh ref={crystals} args={[undefined, m.crystal, count]}>
        <octahedronGeometry args={[1, 0]} />
      </instancedMesh>
      <sprite scale={[2.6, 2.6, 1]} position={[0, 0.2, 0]}>
        <spriteMaterial map={glow} color="#ffd29a" transparent opacity={0.3} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </group>
  );
}

function makeTextures(mobile: boolean) {
  const marble = marbleTexture(mobile ? 512 : 1024);
  marble.repeat.set((HALL.halfWidth * 2) / 2.4, LEN / 2.4);
  const runner = rugTexture(256, 1024, true);
  runner.repeat.set(1, 4);
  return {
    marble,
    runner,
    jaali: jaaliTexture(),
    glow: glowTexture(),
    ao: aoStripTexture(),
    wash: washTexture(),
    nicheBack: nicheBackTexture(),
  };
}
type Tex = ReturnType<typeof makeTextures>;

export default function BoutiqueHall({ mobile }: { mobile: boolean }) {
  const tex = useMemo(() => makeTextures(mobile), [mobile]);
  const m = useMemo(() => makeHallMaterials(), []);
  const endWall = useMemo(
    () => wallGeometry(-HALL.halfWidth - 0.01, HALL.halfWidth + 0.01, HALL.height, [{ u: 0, arch: END }], 0.7),
    [],
  );
  const endBead = useMemo(() => beadGeometry(END, 0.03), []);
  const doorBead = useMemo(() => beadGeometry(DOOR, 0.022), []);

  return (
    <group>
      {/* Polished white marble with a blurred real reflection (plain on mobile). */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, MID_Z]} receiveShadow>
        <planeGeometry args={[HALL.halfWidth * 2 + 0.1, LEN]} />
        {mobile ? (
          <meshStandardMaterial map={tex.marble} roughness={0.2} />
        ) : (
          <MeshReflectorMaterial
            map={tex.marble}
            resolution={512}
            blur={[260, 80]}
            mixBlur={0.9}
            mixStrength={2.2}
            mixContrast={1}
            mirror={0.75}
            depthScale={1.1}
            minDepthThreshold={0.25}
            maxDepthThreshold={1.3}
            roughness={0.18}
            metalness={0.05}
            color="#ffffff"
          />
        )}
      </mesh>
      {/* Baked AO where the floor meets the walls. */}
      {[-1, 1].map((s) => (
        <mesh key={s} rotation={[-Math.PI / 2, 0, s * (Math.PI / 2)]} position={[s * (HALL.halfWidth - 0.35), 0.003, MID_Z]}>
          <planeGeometry args={[LEN, 0.7]} />
          <meshBasicMaterial map={tex.ao} transparent depthWrite={false} opacity={0.9} />
        </mesh>
      ))}
      {/* Brass inlay lines and the kilim runner. */}
      {[-1, 1].map((s) => (
        <mesh key={`i${s}`} position={[s * 1.7, 0.002, (HALL.entranceZ + 1.9) / 2]} material={m.brass}>
          <boxGeometry args={[0.025, 0.004, HALL.entranceZ - 1.9]} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, (14.5 + 2.2) / 2]} receiveShadow>
        <planeGeometry args={[1.2, 14.5 - 2.2]} />
        <meshStandardMaterial map={tex.runner} roughness={0.95} />
      </mesh>

      {/* Ceiling. */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, HALL.height, MID_Z]} material={m.ceiling}>
        <planeGeometry args={[HALL.halfWidth * 2 + 1.4, LEN]} />
      </mesh>
      {/* Track rails. */}
      {[-1, 1].map((s) => (
        <mesh key={`t${s}`} position={[s * 1.75, HALL.height - 0.03, MID_Z + 1]} material={m.black}>
          <boxGeometry args={[0.04, 0.04, LEN - 3]} />
        </mesh>
      ))}

      <SideWall side={-1} m={m} tex={tex} />
      <SideWall side={1} m={m} tex={tex} />
      {[-1, 1].map((s) => (
        <mesh
          key={`db${s}`}
          geometry={doorBead}
          material={m.brass}
          position={[s * (HALL.halfWidth - 0.012), 0, HALL.doorZ]}
          rotation={[0, -s * (Math.PI / 2), 0]}
        />
      ))}
      <Instanced m={m} />

      {/* End wall: the big scalloped arch with a backlit jaali behind the sofa. */}
      <mesh geometry={endWall} material={m.wall} position={[0, 0, HALL.endZ - 0.7]} receiveShadow />
      <mesh geometry={endBead} material={m.brass} position={[0, 0, HALL.endZ + 0.012]} />
      <mesh position={[0, 2.0, HALL.endZ - 0.69]} receiveShadow>
        <planeGeometry args={[3.8, 4.0]} />
        <meshStandardMaterial map={tex.nicheBack} roughness={0.7} />
      </mesh>
      <mesh position={[0, 2.55, HALL.endZ - 0.66]}>
        <planeGeometry args={[2.6, 1.9]} />
        <meshStandardMaterial color="#000000" emissive="#ffffff" emissiveMap={tex.jaali} emissiveIntensity={0.9} />
      </mesh>
      {/* Wall sconces either side of the arch. */}
      {[-2.35, 2.35].map((x) => (
        <group key={x} position={[x, 2.95, HALL.endZ + 0.05]}>
          <mesh material={m.brass}>
            <boxGeometry args={[0.1, 0.3, 0.04]} />
          </mesh>
          <mesh position={[0, 0.12, 0.1]} material={m.glass}>
            <cylinderGeometry args={[0.07, 0.09, 0.2, 16, 1, true]} />
          </mesh>
          <mesh position={[0, 0.1, 0.1]} material={m.bulb}>
            <sphereGeometry args={[0.03, 8, 6]} />
          </mesh>
          <sprite position={[0, 0.1, 0.12]} scale={[0.9, 0.9, 1]}>
            <spriteMaterial map={tex.glow} color="#ffcf90" transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} />
          </sprite>
        </group>
      ))}

      {HALL.pendants.map((z) => (
        <Pendant key={z} z={z} m={m} glow={tex.glow} />
      ))}
      <Chandelier m={m} glow={tex.glow} mobile={mobile} />
    </group>
  );
}
