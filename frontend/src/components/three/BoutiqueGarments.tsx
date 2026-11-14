"use client";
// Hanging garments in the niches: one instanced, alpha-tested plane per piece,
// all sampling a single procedural atlas (lehengas and gowns filled with the
// lookbook embroidery crops). Some niches hang them front-facing in an
// overlapping fan, others closet-style perpendicular to the wall (so from the
// corridor you see a stack of fronts). Each piece sways gently from its hanger
// in the vertex shader, with a slow ripple running down to the hem.
import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { HALL } from "./boutiqueLayout";
import { GARMENT_CELLS, garmentAtlas, rng } from "./boutiqueTextures";

const vertex = /* glsl */ `
  attribute float aCell;
  attribute float aPhase;
  uniform float uTime;
  varying vec2 vUv;
  varying float vHang;
  #include <fog_pars_vertex>

  void main() {
    vec3 p = position;            // y in [-1, 0]: hung from the top edge
    float hang = -p.y;
    float t = uTime;
    p.x += sin(t * 0.7 + aPhase) * 0.018 * hang * hang + sin(hang * 6.0 - t * 1.4 + aPhase) * 0.006 * hang;
    p.z += sin(t * 0.55 + aPhase * 1.3) * 0.035 * hang * hang;
    float col = mod(aCell, 4.0);
    float row = floor(aCell / 4.0);
    vUv = vec2((col + uv.x) / 4.0, 1.0 - (row + 1.0 - uv.y) / 2.0);
    vHang = hang;
    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uLight;
  varying vec2 vUv;
  varying float vHang;
  #include <fog_pars_fragment>

  void main() {
    vec4 tex = texture2D(uMap, vUv);
    if (tex.a < 0.5) discard;
    // Lit from the track spot above: brighter at the shoulders, falling off to the hem.
    vec3 col = tex.rgb * uLight * mix(1.1, 0.55, smoothstep(0.0, 1.0, vHang));
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

export default function BoutiqueGarments({ mobile }: { mobile: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const map = useMemo(() => garmentAtlas(), []);

  const layout = useMemo(() => {
    const r = rng(42);
    const items: { pos: THREE.Vector3; rotY: number; sx: number; sy: number; cell: number; phase: number }[] = [];
    HALL.niches.forEach((z, n) => {
      for (const side of [-1, 1] as const) {
        const closet = (n + (side > 0 ? 1 : 0)) % 2 === 1;
        if (closet) {
          const count = mobile ? 5 : 8;
          for (let k = 0; k < count; k++) {
            const zz = z + 0.82 - (k / (count - 1)) * 1.64;
            items.push({
              pos: new THREE.Vector3(side * (HALL.halfWidth + 0.33), 2.37, zz),
              rotY: (r() - 0.5) * 0.18,
              sx: 0.6,
              sy: 1.5 + r() * 0.08,
              cell: Math.floor(r() * GARMENT_CELLS),
              phase: r() * 6.28,
            });
          }
        } else {
          const count = mobile ? 4 : 6;
          for (let k = 0; k < count; k++) {
            const zz = z - 0.78 + (k / (count - 1)) * 1.56;
            items.push({
              pos: new THREE.Vector3(side * (HALL.halfWidth + 0.38 + (k % 2) * 0.05), 2.37, zz),
              rotY: -side * (Math.PI / 2) + (r() - 0.5) * 0.24,
              sx: 0.78,
              sy: 1.56 + r() * 0.06,
              cell: Math.floor(r() * GARMENT_CELLS),
              phase: r() * 6.28,
            });
          }
        }
      }
    });
    return items;
  }, [mobile]);

  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1, 1, 14);
    g.translate(0, -0.5, 0);
    g.setAttribute("aCell", new THREE.InstancedBufferAttribute(new Float32Array(layout.map((i) => i.cell)), 1));
    g.setAttribute("aPhase", new THREE.InstancedBufferAttribute(new Float32Array(layout.map((i) => i.phase)), 1));
    return g;
  }, [layout]);

  const uniforms = useMemo(
    () =>
      THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        { uMap: { value: null }, uTime: { value: 0 }, uLight: { value: new THREE.Color("#fff0dc") } },
      ]),
    [],
  );

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const o = new THREE.Object3D();
    layout.forEach((it, i) => {
      o.position.copy(it.pos);
      o.rotation.set(0, it.rotY, 0);
      o.scale.set(it.sx, it.sy, 1);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [layout]);

  useFrame((_, delta) => {
    const m = mat.current;
    if (!m) return;
    m.uniforms.uMap.value = map;
    m.uniforms.uTime.value += Math.min(delta, 0.05);
  });

  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, layout.length]} frustumCulled={false}>
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        vertexShader={vertex}
        fragmentShader={fragment}
        fog
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
}
