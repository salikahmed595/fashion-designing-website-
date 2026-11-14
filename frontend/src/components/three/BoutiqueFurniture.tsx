"use client";
// Furniture at the end of the boutique: a magenta channel-tufted velvet sofa
// with a scalloped shell back (instanced capsule channels), two matching shell
// armchairs, a green velvet pouf, a full-length arched gold mirror, a glass
// display table with folded fabric, and the medallion rug. Velvet uses
// MeshPhysicalMaterial sheen; everything casts soft shadows.
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { HALL, SOFA } from "./boutiqueLayout";
import { rugTexture } from "./boutiqueTextures";

const velvet = () =>
  new THREE.MeshPhysicalMaterial({
    color: "#8a0f3f",
    roughness: 0.78,
    sheen: 1,
    sheenRoughness: 0.35,
    sheenColor: new THREE.Color("#ff6fa8"),
  });

type Channel = { x: number; z: number; h: number; rotY: number };

/** Capsule channels following a U: straight back, then curving forward into the arms. */
function sofaChannels(): Channel[] {
  const out: Channel[] = [];
  const n = 9;
  const half = SOFA.width / 2 - 0.16;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = -half + t * half * 2;
    const arc = 1 - Math.pow(Math.abs(t - 0.5) * 2, 2);
    out.push({ x, z: SOFA.backZ + 0.14 + (1 - arc) * 0.05, h: 0.4 + arc * 0.12, rotY: 0 });
  }
  for (const s of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      out.push({
        x: s * (SOFA.width / 2 - 0.13),
        z: SOFA.backZ + 0.36 + k * 0.22,
        h: 0.28 - k * 0.03,
        rotY: s * (Math.PI / 2),
      });
    }
  }
  return out;
}

/** Shell armchair channels: an arc of capsules around the seat. */
function chairChannels(): Channel[] {
  const out: Channel[] = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI * 0.62 + (i / (n - 1)) * Math.PI * 1.24; // around the back
    const arc = 1 - Math.pow(Math.abs(i / (n - 1) - 0.5) * 2, 2);
    out.push({ x: Math.sin(a) * 0.36, z: -Math.cos(a) * 0.3, h: 0.3 + arc * 0.14, rotY: a });
  }
  return out;
}

const CHAIRS = [
  { x: -1.75, z: 1.05, rot: 2.1 },
  { x: 1.75, z: 1.05, rot: -2.1 },
];

function Legs({ pts, brass, y = 0.06, h = 0.12 }: { pts: [number, number][]; brass: THREE.Material; y?: number; h?: number }) {
  return (
    <>
      {pts.map(([x, z]) => (
        <mesh key={`${x},${z}`} position={[x, y, z]} material={brass} castShadow>
          <cylinderGeometry args={[0.022, 0.014, h, 10]} />
        </mesh>
      ))}
    </>
  );
}

export default function BoutiqueFurniture() {
  const mats = useMemo(
    () => ({
      velvet: velvet(),
      green: new THREE.MeshPhysicalMaterial({ color: "#0d5a45", roughness: 0.8, sheen: 1, sheenRoughness: 0.4, sheenColor: new THREE.Color("#5fe0b0") }),
      mirror: new THREE.MeshStandardMaterial({ color: "#eef4f2", metalness: 1, roughness: 0.03, envMapIntensity: 3.2 }),
      fabric: new THREE.MeshStandardMaterial({ color: "#e3187d", roughness: 0.8 }),
      fabric2: new THREE.MeshStandardMaterial({ color: "#d9a441", roughness: 0.6, metalness: 0.2 }),
      rug: new THREE.MeshStandardMaterial({ map: rugTexture(768, 512), roughness: 0.95 }),
      brass: new THREE.MeshStandardMaterial({ color: "#d4ac58", metalness: 1, roughness: 0.28 }),
      glass: new THREE.MeshPhysicalMaterial({
        color: "#eef7f4",
        roughness: 0.04,
        transparent: true,
        opacity: 0.22,
        clearcoat: 1,
        depthWrite: false,
      }),
    }),
    [],
  );
  const { brass, glass } = mats;
  const channels = useRef<THREE.InstancedMesh>(null);
  const sofaC = useMemo(() => sofaChannels(), []);
  const chairC = useMemo(() => chairChannels(), []);
  const total = sofaC.length + chairC.length * CHAIRS.length;
  const capsule = useMemo(() => {
    const g = new THREE.CapsuleGeometry(0.125, 1, 6, 14);
    g.translate(0, 0.5, 0); // base at y = 0, unit body length
    return g;
  }, []);

  const mirrorShape = useMemo(() => {
    const s = new THREE.Shape();
    const w = 0.42;
    s.moveTo(-w, 0);
    s.lineTo(w, 0);
    s.lineTo(w, 1.7);
    s.absarc(0, 1.7, w, 0, Math.PI, false);
    s.lineTo(-w, 0);
    return s;
  }, []);
  const mirrorFrame = useMemo(() => {
    const s = new THREE.Shape();
    const w = 0.5;
    s.moveTo(-w, -0.08);
    s.lineTo(w, -0.08);
    s.lineTo(w, 1.7);
    s.absarc(0, 1.7, w, 0, Math.PI, false);
    s.lineTo(-w, -0.08);
    const h = new THREE.Path();
    const iw = 0.42;
    h.moveTo(-iw, 0);
    h.lineTo(iw, 0);
    h.lineTo(iw, 1.7);
    h.absarc(0, 1.7, iw, 0, Math.PI, false);
    h.lineTo(-iw, 0);
    s.holes.push(h);
    return new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2, curveSegments: 24 });
  }, []);

  useLayoutEffect(() => {
    const m = channels.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const base = SOFA.seatY - 0.13;
    let i = 0;
    for (const c of sofaC) {
      o.position.set(c.x, base, c.z);
      o.rotation.set(-0.08, c.rotY, 0);
      o.scale.set(1, c.h, 0.62);
      o.updateMatrix();
      m.setMatrixAt(i++, o.matrix);
    }
    const parent = new THREE.Object3D();
    for (const ch of CHAIRS) {
      parent.position.set(ch.x, 0, ch.z);
      parent.rotation.set(0, ch.rot, 0);
      parent.updateMatrix();
      for (const c of chairC) {
        o.position.set(c.x, 0.3, c.z);
        o.rotation.set(-0.12 * Math.cos(c.rotY), c.rotY, 0);
        o.scale.set(0.8, c.h, 0.55);
        o.updateMatrix();
        o.matrix.premultiply(parent.matrix);
        m.setMatrixAt(i++, o.matrix);
      }
    }
    m.instanceMatrix.needsUpdate = true;
  }, [sofaC, chairC]);

  const depth = SOFA.seatFrontZ - SOFA.backZ;
  const cz = (SOFA.seatFrontZ + SOFA.backZ) / 2;
  const baseTop = SOFA.seatY - 0.13;

  return (
    <group>
      {/* Rug under the seating group. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0.05]} material={mats.rug} receiveShadow>
        <planeGeometry args={[4.4, 3.0]} />
      </mesh>

      {/* Sofa: plinth, seat cushion, shell back channels, brass legs. */}
      <RoundedBox args={[SOFA.width, baseTop - 0.1, depth]} radius={0.06} smoothness={3} position={[0, 0.1 + (baseTop - 0.1) / 2, cz]} material={mats.velvet} castShadow receiveShadow />
      <RoundedBox
        args={[SOFA.width - 0.5, 0.15, depth - 0.24]}
        radius={0.065}
        smoothness={4}
        position={[0, SOFA.seatY - 0.075, SOFA.seatFrontZ - (depth - 0.24) / 2 - 0.01]}
        material={mats.velvet}
        castShadow
        receiveShadow
      />
      <mesh position={[0, 0.115, SOFA.seatFrontZ + 0.004]} material={brass}>
        <boxGeometry args={[SOFA.width - 0.12, 0.02, 0.012]} />
      </mesh>
      <Legs
        brass={brass}
        pts={[
          [-SOFA.width / 2 + 0.14, SOFA.seatFrontZ - 0.08],
          [SOFA.width / 2 - 0.14, SOFA.seatFrontZ - 0.08],
          [-SOFA.width / 2 + 0.14, SOFA.backZ + 0.1],
          [SOFA.width / 2 - 0.14, SOFA.backZ + 0.1],
        ]}
      />
      <instancedMesh ref={channels} args={[capsule, mats.velvet, total]} castShadow receiveShadow />

      {/* Shell armchairs: seat discs on brass legs (channels are instanced above). */}
      {CHAIRS.map((c) => (
        <group key={c.x} position={[c.x, 0, c.z]} rotation={[0, c.rot, 0]}>
          <mesh position={[0, 0.36, 0.02]} material={mats.velvet} castShadow receiveShadow>
            <cylinderGeometry args={[0.36, 0.34, 0.14, 32]} />
          </mesh>
          <mesh position={[0, 0.27, 0.02]} material={mats.velvet} castShadow>
            <cylinderGeometry args={[0.34, 0.3, 0.06, 32]} />
          </mesh>
          <Legs brass={brass} y={0.12} h={0.24} pts={[[-0.22, 0.2], [0.22, 0.2], [-0.22, -0.18], [0.22, -0.18]]} />
        </group>
      ))}

      {/* Green velvet pouf with a brass band. */}
      <group position={[-2.15, 0, 2.55]}>
        <mesh position={[0, 0.22, 0]} material={mats.green} castShadow receiveShadow>
          <cylinderGeometry args={[0.28, 0.28, 0.4, 32]} />
        </mesh>
        <mesh position={[0, 0.02, 0]} material={brass} castShadow>
          <cylinderGeometry args={[0.285, 0.285, 0.04, 32]} />
        </mesh>
      </group>

      {/* Full-length arched gold mirror leaning on the left wall. */}
      <group position={[-HALL.halfWidth + 0.12, 0.05, 1.95]} rotation={[0, Math.PI / 2, 0]}>
        <group rotation={[-0.06, 0, 0]}>
          <mesh geometry={mirrorFrame} material={brass} castShadow />
          <mesh position={[0, 0, 0.03]} material={mats.mirror}>
            <shapeGeometry args={[mirrorShape, 24]} />
          </mesh>
        </group>
      </group>

      {/* Glass display table with folded fabric, on the right. */}
      <group position={[HALL.halfWidth - 0.5, 0, 2.1]}>
        <mesh position={[0, 0.82, 0]} material={glass}>
          <boxGeometry args={[0.6, 0.02, 1.3]} />
        </mesh>
        <mesh position={[0, 0.6, 0]} material={glass}>
          <boxGeometry args={[0.56, 0.42, 1.26]} />
        </mesh>
        {[
          [-0.29, -0.64],
          [0.29, -0.64],
          [-0.29, 0.64],
          [0.29, 0.64],
        ].map(([x, z]) => (
          <mesh key={`${x}${z}`} position={[x, 0.42, z]} material={brass} castShadow>
            <boxGeometry args={[0.025, 0.84, 0.025]} />
          </mesh>
        ))}
        <mesh position={[0, 0.39, 0]} material={brass}>
          <boxGeometry args={[0.6, 0.02, 1.3]} />
        </mesh>
        <mesh position={[0, 0.44, -0.25]} material={mats.fabric} castShadow>
          <boxGeometry args={[0.36, 0.07, 0.4]} />
        </mesh>
        <mesh position={[0, 0.5, -0.22]} material={mats.fabric2} castShadow>
          <boxGeometry args={[0.32, 0.05, 0.36]} />
        </mesh>
        <mesh position={[0, 0.45, 0.32]} material={mats.green} castShadow>
          <boxGeometry args={[0.3, 0.08, 0.34]} />
        </mesh>
      </group>
    </group>
  );
}
