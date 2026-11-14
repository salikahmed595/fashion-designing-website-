"use client";
// One model cut-out in the boutique scene: an alpha-textured plane (premultiplied,
// alpha-tested, fog-matched, warm tint) that steps out of a side doorway, walks
// to the sofa with a gentle bob and sway, then sits. Sitting is done in the
// vertex shader: the plane is hinged at the knee and hip, so the shin stays
// planted on the floor, the thigh folds forward over the seat cushion and the
// torso settles onto the sofa; the dress falls from the lap to the floor.
import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { HALL, MODEL_H, SOFA, BEATS, easeInOut, remap, sineInOut } from "./boutiqueLayout";

const vertex = /* glsl */ `
  uniform float uH;
  uniform float uW;
  uniform float uKnee;   // v of the knee
  uniform float uHip;    // v of the hip
  uniform float uBend;   // thigh angle (0 standing .. ~1.5 seated)
  uniform float uLean;
  varying vec2 vUv;
  varying float vHeight;
  #include <fog_pars_vertex>

  void main() {
    vUv = uv;
    float v = uv.y;
    vec3 p = vec3((uv.x - 0.5) * uW, 0.0, 0.0);
    vec3 thigh = vec3(0.0, cos(uBend), -sin(uBend));
    vec3 torso = vec3(0.0, cos(uLean), -sin(uLean));
    vec3 knee = vec3(0.0, uKnee * uH, 0.0);
    vec3 hip = knee + thigh * (uHip - uKnee) * uH;
    if (v <= uKnee) p.y = v * uH;
    else if (v <= uHip) p += knee + thigh * (v - uKnee) * uH;
    else p += hip + torso * (v - uHip) * uH;
    vHeight = p.y;
    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uTint;
  uniform float uOpacity;
  uniform float uGlow;
  varying vec2 vUv;
  varying float vHeight;
  #include <fog_pars_fragment>

  void main() {
    vec4 tex = texture2D(uMap, vUv);
    float a = tex.a * uOpacity;
    if (a < 0.04) discard;
    // Warm room light: a touch darker toward the floor, a warm rim from the lamps.
    vec3 col = tex.rgb * uTint * mix(0.78, 1.04, smoothstep(0.0, 1.5, vHeight));
    col += tex.rgb * vec3(1.0, 0.62, 0.35) * uGlow * smoothstep(0.6, 1.0, tex.a) * 0.12;
    gl_FragColor = vec4(col, a);
    #include <colorspace_fragment>
    #include <fog_fragment>
    gl_FragColor.rgb *= gl_FragColor.a;
  }
`;

type Props = {
  url: string;
  /** -1 enters from the left doorway and takes the left seat, +1 the right. */
  side: -1 | 1;
  index: 0 | 1;
  progress: RefObject<number>;
  shadow: THREE.Texture;
};

export default function BoutiqueModel({ url, side, index, progress, shadow }: Props) {
  const map = useTexture(url, (t) => {
    const tex = Array.isArray(t) ? t[0] : t;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
  });
  const group = useRef<THREE.Group>(null);
  const blob = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);

  const aspect = useMemo(() => {
    const img = map.image as { width?: number; height?: number } | undefined;
    return img?.width && img?.height ? img.width / img.height : 0.4;
  }, [map]);

  const uniforms = useMemo(
    () =>
      THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uMap: { value: null },
          uH: { value: MODEL_H },
          uW: { value: MODEL_H * 0.4 },
          uKnee: { value: 0.27 },
          uHip: { value: 0.5 },
          uBend: { value: 0 },
          uLean: { value: 0 },
          uTint: { value: new THREE.Color("#fff1e4") },
          uOpacity: { value: 0 },
          uGlow: { value: 0 },
        },
      ]),
    [],
  );
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1, 1, 64), []);

  const start = useMemo(() => new THREE.Vector3(side * (HALL.halfWidth + 0.25), 0, HALL.doorZ), [side]);
  const end = useMemo(() => {
    // Feet planted so the hip lands on the seat when the thigh folds.
    const thigh = (0.5 - 0.27) * MODEL_H;
    return new THREE.Vector3(side * SOFA.seatX, 0, SOFA.hipZ + thigh * Math.sin(1.5));
  }, [side]);

  useFrame(({ clock }) => {
    const g = group.current;
    const m = mat.current;
    if (!g || !m) return;
    const p = progress.current ?? 0;
    const [w0, w1] = BEATS.walk[index];
    const [s0, s1] = BEATS.sit[index];
    const raw = remap(p, w0, w1);
    const w = sineInOut(raw);
    const s = easeInOut(remap(p, s0, s1));
    const walking = raw > 0 && raw < 1 ? Math.sin(raw * Math.PI) : 0;

    // Path: out of the doorway, curving toward the front of the seat.
    const x = THREE.MathUtils.lerp(start.x, end.x, w);
    const z = THREE.MathUtils.lerp(start.z, end.z, Math.pow(w, 0.7));
    const steps = raw * 9;
    const bob = Math.abs(Math.sin(steps * Math.PI)) * 0.03 * walking;
    g.position.set(x, bob, z);
    // Turn slightly toward the direction of travel, then face front.
    g.rotation.y = -side * 0.32 * walking * (1 - s);
    g.rotation.z = Math.sin(steps * Math.PI) * 0.012 * walking;
    const breathe = 1 + Math.sin(clock.elapsedTime * 1.2 + index) * 0.003;
    g.scale.setScalar((0.97 + 0.03 * w) * breathe);

    const u = m.uniforms;
    u.uMap.value = map;
    u.uW.value = MODEL_H * aspect;
    u.uBend.value = s * 1.5;
    u.uLean.value = -s * 0.06;
    u.uOpacity.value = remap(raw, 0.0, 0.14);
    u.uGlow.value = 0.4 + 0.6 * w;
    g.visible = raw > 0;

    if (blob.current) {
      const bm = blob.current.material as THREE.MeshBasicMaterial;
      bm.opacity = u.uOpacity.value * (0.75 - 0.25 * s);
      blob.current.scale.set(MODEL_H * aspect * 1.25, 0.5 + s * 0.15, 1);
    }
  });

  return (
    <group ref={group} visible={false}>
      <mesh ref={blob} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0.02]} renderOrder={1}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={shadow} transparent depthWrite={false} opacity={0} />
      </mesh>
      <mesh geometry={geometry} frustumCulled={false} renderOrder={2}>
        <shaderMaterial
          ref={mat}
          uniforms={uniforms}
          vertexShader={vertex}
          fragmentShader={fragment}
          fog
          transparent
          premultipliedAlpha
          depthWrite
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
