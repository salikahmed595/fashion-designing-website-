"use client";
// One model cut-out in the boutique: an alpha-tested, premultiplied, fog-matched
// plane that steps out of a side doorway, walks to the sofa, turns to face the
// camera and sits. It casts a real (alpha-tested) soft shadow.
//
// The walk is faked in the vertex shader by bending regions of the flat photo:
//  - gait phase runs on time (one step per ~0.55 s) whenever she is moving;
//  - the body bobs twice per cycle, the pelvis shifts and tilts side to side,
//    the shoulders counter-rotate (real yaw of the upper body, opposite to the
//    hips) and the head is kept steadier than the torso;
//  - the skirt swings with a lag that grows toward the hem, the hem flares on
//    each step, and the left/right lower halves push forward alternately as if
//    legs were stepping under the dress.
// Sitting is a hinge at the knee and hip (feet planted, thighs fold over the
// seat, torso settles), blended in after the walk and the turn.
// Once her scroll window is reached she keeps walking on time, so a pause in
// scrolling never freezes her mid-stride.
import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { HIP_V, KNEE_V, MODEL_H, SOFA, clamp01, remap } from "./boutiqueLayout";
import { newWalkState, smooth, stepWalk, walkPath, type WalkState } from "./boutiqueWalk";

const vertex = /* glsl */ `
  uniform float uH;
  uniform float uW;
  uniform float uKnee;
  uniform float uHip;
  uniform float uBend;   // thigh angle (0 standing .. 1.5 seated)
  uniform float uLean;
  uniform float uPhase;  // gait phase (radians, 2pi = two steps)
  uniform float uGait;   // walk intensity 0..1
  varying vec2 vUv;
  varying float vHeight;
  varying float vTurn;
  #include <fog_pars_vertex>

  void main() {
    vUv = uv;
    float v = uv.y;
    float xl = (uv.x - 0.5) * uW;

    // Sitting hinge.
    vec3 p = vec3(xl, 0.0, 0.0);
    vec3 thigh = vec3(0.0, cos(uBend), -sin(uBend));
    vec3 torso = vec3(0.0, cos(uLean), -sin(uLean));
    vec3 knee = vec3(0.0, uKnee * uH, 0.0);
    vec3 hip = knee + thigh * (uHip - uKnee) * uH;
    if (v <= uKnee) p.y = v * uH;
    else if (v <= uHip) p += knee + thigh * (v - uKnee) * uH;
    else p += hip + torso * (v - uHip) * uH;

    // Gait.
    float g = uGait;
    float s = sin(uPhase);
    float c = cos(uPhase);
    float legW = 1.0 - smoothstep(0.3, 0.52, v);
    float hipW = exp(-pow((v - 0.5) / 0.09, 2.0));
    float torsoW = smoothstep(0.5, 0.68, v);
    float headW = smoothstep(0.84, 0.9, v);
    float upper = torsoW * (1.0 - 0.55 * headW);   // head steadier than torso

    // Bob twice per cycle (hem stays near the floor).
    p.y += g * 0.024 * (0.5 - 0.5 * cos(2.0 * uPhase)) * smoothstep(0.0, 0.35, v);
    // Pelvis: lateral shift and tilt; the legs follow part of the shift.
    float shift = s * 0.022 * g;
    p.x += shift * (hipW + legW * 0.55 + torsoW * 0.35);
    p.y += xl * s * 0.06 * g * hipW;
    // Shoulders counter the hips: opposite tilt and yaw; hips yaw with the stride.
    p.y -= xl * s * 0.035 * g * upper;
    p.z += -xl * s * 0.16 * g * upper;
    p.z += xl * s * 0.12 * g * (hipW + legW * 0.4);
    p.x -= s * 0.01 * g * upper;
    // Slight forward lean of the torso while walking.
    p.z += (v - 0.5) * 0.05 * g * torsoW;
    // Skirt: lagged swing down to the hem and a flare on every step.
    float lag = clamp((0.52 - v) / 0.52, 0.0, 1.0);
    p.x += sin(uPhase - lag * 1.9) * 0.03 * g * pow(lag, 1.3);
    p.x += xl * 0.05 * g * sin(2.0 * uPhase - lag * 2.2) * lag * lag;
    // Legs stepping under the dress: left/right halves push forward alternately.
    float side = clamp(xl / (uW * 0.22), -1.0, 1.0);
    float leftStep = max(0.0, s);
    float rightStep = max(0.0, -s);
    float push = mix(rightStep, leftStep, (1.0 - side) * 0.5);
    float lower = 1.0 - smoothstep(0.08, 0.46, v);
    p.z += push * 0.09 * g * lower;
    p.y += push * 0.014 * g * (1.0 - smoothstep(0.0, 0.18, v));

    vHeight = p.y;
    vTurn = (-xl * s * 0.16 * g * upper + xl * s * 0.12 * g * (hipW + legW * 0.4)) / max(uW, 0.01);
    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec2 uTexel;
  uniform vec3 uTint;
  uniform vec3 uAmbient;
  uniform vec3 uRim;
  uniform float uOpacity;
  uniform float uKey;
  varying vec2 vUv;
  varying float vHeight;
  varying float vTurn;
  #include <fog_pars_fragment>

  float alphaAt(vec2 o) { return texture2D(uMap, vUv + o * uTexel).a; }

  void main() {
    vec4 tex = texture2D(uMap, vUv);
    // Softened silhouette (a touch of depth blur at the cut-out edge).
    float soft = (tex.a * 2.0 + alphaAt(vec2(1.5, 0.0)) + alphaAt(vec2(-1.5, 0.0))
               + alphaAt(vec2(0.0, 1.5)) + alphaAt(vec2(0.0, -1.5))) / 6.0;
    float a = soft * uOpacity;
    if (a < 0.04) discard;
    // How close we are to the outline (wider taps) -> rim light.
    float wide = (alphaAt(vec2(6.0, 0.0)) + alphaAt(vec2(-6.0, 0.0)) + alphaAt(vec2(0.0, 6.0)) + alphaAt(vec2(0.0, -6.0))) * 0.25;
    float edge = 1.0 - smoothstep(0.55, 0.98, wide);
    // Room light: darker toward the floor, warmer as she nears the key light;
    // parts turning away darken; the teal room tints the shadows.
    float light = mix(0.74, 1.04, smoothstep(0.0, 1.5, vHeight)) * (1.0 - vTurn * 3.0);
    vec3 col = tex.rgb * uTint * light * mix(0.85, 1.03, uKey);
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, col * uAmbient, 0.22 * (1.0 - smoothstep(0.1, 0.6, lum)));
    col += tex.rgb * vec3(1.0, 0.7, 0.45) * uKey * 0.05;
    col += uRim * edge * (0.25 + 0.35 * uKey) * smoothstep(0.3, 1.2, vHeight);
    gl_FragColor = vec4(col, a);
    #include <colorspace_fragment>
    #include <fog_fragment>
    gl_FragColor.rgb *= gl_FragColor.a;
  }
`;

/** Shadow pass: same deformation, alpha-tested silhouette. */
const depthFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    if (texture2D(uMap, vUv).a * uOpacity < 0.5) discard;
    gl_FragColor = vec4(1.0);
  }
`;

type Props = {
  url: string;
  /** -1 enters from the left doorway and takes the left seat, +1 the right. */
  side: -1 | 1;
  index: 0 | 1;
  progress: RefObject<number>;
  shadow: THREE.Texture;
  still: boolean;
  /** Cast a real shadow-map shadow (medium/high tiers). */
  castShadows: boolean;
};

export default function BoutiqueModel({ url, side, index, progress, shadow, still, castShadows }: Props) {
  const map = useTexture(url, (t) => {
    const tex = Array.isArray(t) ? t[0] : t;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
  });
  const group = useRef<THREE.Group>(null);
  const blob = useRef<THREE.Mesh>(null);
  const seatBlob = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  // Animation state (time-driven, chasing the scroll).
  const state = useRef<WalkState>(newWalkState(index));

  const aspect = useMemo(() => {
    const img = map.image as { width?: number; height?: number } | undefined;
    return img?.width && img?.height ? img.width / img.height : 0.4;
  }, [map]);
  const texel = useMemo(() => {
    const img = map.image as { width?: number; height?: number } | undefined;
    return new THREE.Vector2(1 / (img?.width || 512), 1 / (img?.height || 1280));
  }, [map]);

  const uniforms = useMemo(
    () =>
      THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uMap: { value: null },
          uTexel: { value: new THREE.Vector2(1 / 512, 1 / 1280) },
          uH: { value: MODEL_H },
          uW: { value: MODEL_H * 0.4 },
          uKnee: { value: KNEE_V },
          uHip: { value: HIP_V },
          uBend: { value: 0 },
          uLean: { value: 0 },
          uPhase: { value: 0 },
          uGait: { value: 0 },
          uTint: { value: new THREE.Color("#fff3e8") },
          uAmbient: { value: new THREE.Color("#7fc7bb") },
          uRim: { value: new THREE.Color("#ffd8b0") },
          uOpacity: { value: 0 },
          uKey: { value: 0 },
        },
      ]),
    [],
  );
  const depthMaterial = useMemo(
    () => new THREE.ShaderMaterial({ uniforms, vertexShader: vertex, fragmentShader: depthFragment, side: THREE.DoubleSide }),
    [uniforms],
  );
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1, 12, 72), []);
  const curve = useMemo(() => walkPath(side), [side]);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const ahead = useMemo(() => new THREE.Vector3(), []);
  const hipBack = (HIP_V - KNEE_V) * MODEL_H * Math.sin(1.5);

  useFrame(({ clock }, rawDelta) => {
    const g = group.current;
    const m = mat.current;
    if (!g || !m) return;
    const dt = Math.min(rawDelta, 0.05);
    const st = state.current;
    stepWalk(st, progress.current ?? 0, index, dt, still);

    // Path with soft starts and stops.
    const w = smooth(clamp01(st.walk));
    curve.getPoint(w, tmp);
    curve.getPoint(Math.min(1, w + 0.02), ahead);
    g.position.set(tmp.x, 0, tmp.z);
    // Yaw toward the walking direction (partial: she is a photo), back to camera on arrival.
    const lateral = Math.atan2(ahead.x - tmp.x, Math.abs(ahead.z - tmp.z) + 0.004);
    const walkYaw = THREE.MathUtils.clamp(lateral * 0.42, -0.5, 0.5) * (st.walk < 0.999 ? 1 : 0);
    const targetYaw = walkYaw * (1 - st.turn);
    g.rotation.y += (targetYaw - g.rotation.y) * Math.min(1, dt * 4);
    const breathe = 1 + Math.sin(clock.elapsedTime * 1.3 + index) * 0.003;
    g.scale.setScalar(breathe);

    const sit = smooth(clamp01(st.sit));
    const u = m.uniforms;
    u.uMap.value = map;
    u.uTexel.value.copy(texel);
    u.uW.value = MODEL_H * aspect;
    u.uBend.value = sit * 1.5;
    u.uLean.value = -sit * 0.06;
    u.uPhase.value = st.phase;
    u.uGait.value = st.gait * (1 - sit);
    u.uOpacity.value = remap(st.walk, 0.0, 0.1);
    u.uKey.value = smooth(clamp01(st.walk));
    g.visible = st.walk > 0.001;

    if (blob.current) {
      const bm = blob.current.material as THREE.MeshBasicMaterial;
      bm.opacity = u.uOpacity.value * (0.6 - 0.2 * sit);
      blob.current.scale.set(MODEL_H * aspect * 0.9, 0.35 + sit * 0.1, 1);
    }
    if (seatBlob.current) {
      // Contact shadow on the seat cushion under her hips once seated.
      const bm = seatBlob.current.material as THREE.MeshBasicMaterial;
      bm.opacity = 0.7 * sit;
      seatBlob.current.visible = sit > 0.01;
      seatBlob.current.scale.set(MODEL_H * aspect * 0.85, 0.42, 1);
    }
  });

  return (
    <group ref={group} visible={false}>
      <mesh ref={blob} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0.02]} renderOrder={1}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={shadow} transparent depthWrite={false} opacity={0} />
      </mesh>
      <mesh ref={seatBlob} rotation={[-Math.PI / 2, 0, 0]} position={[0, SOFA.seatY + 0.006, -hipBack + 0.1]} renderOrder={1} visible={false}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={shadow} transparent depthWrite={false} opacity={0} />
      </mesh>
      <mesh
        geometry={geometry}
        frustumCulled={false}
        renderOrder={2}
        castShadow={castShadows}
        customDepthMaterial={depthMaterial}
      >
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
