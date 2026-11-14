"use client";
// Hallway furniture: a green velvet pouf, a full-length arched gold mirror and a
// glass display table with folded fabric. (The end of the hall is the wardrobe,
// see BoutiqueWardrobe.) Velvet uses MeshPhysicalMaterial sheen on medium/high
// (Lambert on low); a soft baked contact blob sits under the pouf.
import { useMemo } from "react";
import * as THREE from "three";
import { HALL } from "./boutiqueLayout";
import { surface } from "./boutiqueMaterials";

const velvet = (rich: boolean, color: string, sheenColor: string) =>
  rich
    ? new THREE.MeshPhysicalMaterial({ color, roughness: 0.78, sheen: 1, sheenRoughness: 0.35, sheenColor: new THREE.Color(sheenColor) })
    : new THREE.MeshLambertMaterial({ color });

const POUF = [2.2, 1.7] as const;

export default function BoutiqueFurniture({ rich, blob }: { rich: boolean; blob: THREE.Texture }) {
  const mats = useMemo(
    () => ({
      green: velvet(rich, "#0d5a45", "#5fe0b0"),
      mirror: surface(rich, { color: "#eef4f2", metalness: 1, roughness: 0.03, envMapIntensity: 3.2 }),
      fabric: surface(rich, { color: "#e3187d", roughness: 0.8 }),
      fabric2: surface(rich, { color: "#d9a441", roughness: 0.6, metalness: 0.2 }),
      brass: surface(rich, { color: "#d4ac58", metalness: 1, roughness: 0.28 }),
      glass: surface(rich, {
        color: "#eef7f4",
        roughness: 0.04,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      }),
    }),
    [rich],
  );
  const { brass, glass } = mats;
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

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[POUF[0], 0.009, POUF[1]]} renderOrder={1}>
        <planeGeometry args={[0.9, 0.9]} />
        <meshBasicMaterial map={blob} transparent opacity={0.55} depthWrite={false} />
      </mesh>

      {/* Green velvet pouf with a brass band. */}
      <group position={[POUF[0], 0, POUF[1]]}>
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
      <group position={[HALL.halfWidth - 0.55, 0, 5.4]}>
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
