"use client";
// Three silk ribbons for the Weave section. Each ribbon is a strip mesh whose
// centre-line, twist and width are computed in the vertex shader from uniforms,
// so the whole animation lives on the GPU:
//   empty slot  -> a thin dark thread drifting on a slow wave
//   filled slot -> widens into a twisting silk band with a procedural woven
//                  pattern (stripes / madras checks / zari border) from the swatch
//   all three   -> the bands braid together into a helix
// Lit with wrapped diffuse, specular and a fresnel sheen. Renders only on screen.
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export type RibbonSpec = { colors: string[]; pattern: number } | null;

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uLen;
  uniform float uFill;
  uniform float uBraid;
  uniform float uPhase;
  uniform float uOffset;
  uniform float uAmp;
  uniform float uWide;
  uniform float uThin;
  uniform float uHelixR;
  uniform float uHelixK;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vPos;

  float helixAngle(float x) { return x * uHelixK + uTime * 0.7 + uPhase * 2.0943951; }

  vec3 curve(float x) {
    float t = uTime;
    vec3 free = vec3(
      x,
      uOffset + uAmp * (0.62 * sin(x * 0.85 + t * 0.32 + uPhase * 2.1) + 0.38 * sin(x * 0.41 - t * 0.21 + uPhase * 4.3)),
      0.35 * sin(x * 0.55 + t * 0.27 + uPhase * 3.0)
    );
    float a = helixAngle(x);
    vec3 braid = vec3(x, uHelixR * sin(a), uHelixR * cos(a));
    return mix(free, braid, uBraid);
  }

  void main() {
    vUv = uv;
    float x = (uv.x - 0.5) * uLen;
    vec3 c = curve(x);
    vec3 T = normalize(curve(x + 0.01) - curve(x - 0.01));
    vec3 w0 = normalize(cross(vec3(0.0, 0.0, 1.0), T)); // ~up, in the screen plane
    vec3 b = cross(T, w0);                               // ~toward the camera

    // Twist: a lazy roll when free, wrapped around the helix when braided.
    float thFree = uFill * (1.25 * sin(x * 0.42 + uTime * 0.38 + uPhase * 1.7) + 0.35);
    float th = mix(thFree, -helixAngle(x), uBraid);
    vec3 wd = cos(th) * w0 + sin(th) * b;

    // Soft ruffle on the band edges so it reads as cloth, not a plastic strip.
    float ruffle = sin(x * 9.0 + uTime * 1.6 + uPhase) * 0.04 * uFill * (uv.y - 0.5);
    float width = mix(uThin, uWide, uFill);
    vec3 p = c + wd * (uv.y - 0.5) * width + b * ruffle * width;

    vN = normalize(cross(T, wd));
    vPos = (modelMatrix * vec4(p, 1.0)).xyz;
    gl_Position = projectionMatrix * viewMatrix * vec4(vPos, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uC0;
  uniform vec3 uC1;
  uniform vec3 uC2;
  uniform vec3 uLine;
  uniform float uPattern;
  uniform float uFill;
  uniform float uLen;
  uniform float uWide;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vPos;

  vec3 pick(float k) {
    k = mod(k, 3.0);
    return k < 0.5 ? uC0 : (k < 1.5 ? uC1 : uC2);
  }

  vec3 fabric(vec2 uv) {
    float cu = uv.x * uLen / max(uWide, 0.001); // along the band, in band-widths
    float v = uv.y;
    vec3 zari = mix(uC1, vec3(0.96, 0.8, 0.45), 0.45);
    vec3 col;
    if (uPattern < 0.5) {
      // Lehariya-style diagonal stripes with fine zari rules between them.
      float s = (cu * 0.8 + v) * 2.4;
      float f = fract(s);
      col = pick(floor(s));
      col = mix(col, zari, smoothstep(0.07, 0.0, min(f, 1.0 - f)));
    } else if (uPattern < 1.5) {
      // Madras checks: crossing warp/weft bands, darker where both overlap.
      float sx = floor(fract(cu * 0.7) * 6.0);
      float sy = floor(v * 6.0);
      col = mix(pick(sx), pick(sy + 1.0), 0.5);
      if (mod(sx, 2.0) + mod(sy, 2.0) > 1.5) col *= 0.78;
      float lx = smoothstep(0.03, 0.0, abs(fract(cu * 0.7 * 6.0) - 0.5));
      float ly = smoothstep(0.03, 0.0, abs(fract(v * 6.0) - 0.5));
      col = mix(col, zari, max(lx, ly) * 0.55);
    } else {
      // Zari border with diamond motifs, buti dots in the field.
      float edge = max(step(v, 0.17), step(0.83, v));
      col = mix(uC0, zari, edge);
      float bv = v < 0.5 ? (v - 0.085) / 0.17 : (v - 0.915) / 0.17;
      vec2 g = vec2(fract(cu * 4.0) - 0.5, bv);
      col = mix(col, uC2, step(abs(g.x) + abs(g.y), 0.28) * edge);
      vec2 q = vec2(cu * 1.6, v * 3.0);
      q.x += mod(floor(q.y), 2.0) * 0.5;
      float dotm = smoothstep(0.13, 0.09, length(fract(q) - 0.5)) * (1.0 - edge);
      col = mix(col, zari, dotm);
      col = mix(col, uC2, smoothstep(0.012, 0.0, abs(abs(v - 0.5) - 0.31)));
    }
    // Fine woven thread texture.
    float wv = (0.5 + 0.5 * sin(uv.x * uLen * 150.0)) * (0.5 + 0.5 * sin(uv.y * uWide * 150.0 + 1.5));
    return col * (0.95 + 0.07 * wv);
  }

  void main() {
    vec3 N = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0);
    vec3 V = normalize(cameraPosition - vPos);
    vec3 L = normalize(vec3(-0.35, 0.75, 0.6));
    vec3 H = normalize(L + V);
    float diff = 0.45 + 0.6 * max(dot(N, L), 0.0);
    float spec = pow(max(dot(N, H), 0.0), 28.0) * 0.45;
    float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);

    vec3 base = fabric(vUv);
    vec3 silk = base * diff + spec * vec3(1.0, 0.95, 0.9) + fres * mix(base, vec3(1.0), 0.6) * 0.35;
    if (!gl_FrontFacing) silk *= 0.82; // underside slightly shadowed

    float filled = smoothstep(0.02, 0.35, uFill);
    vec3 col = mix(uLine, silk, filled);
    // Feathered edges once the band is wide (cheap anti-aliasing for cloth).
    float a = mix(0.75, smoothstep(0.0, 0.035, vUv.y) * smoothstep(1.0, 0.965, vUv.y), filled);
    gl_FragColor = vec4(col, a);
  }
`;

function Ribbon({
  index,
  spec,
  braided,
  reduced,
}: {
  index: number;
  spec: RibbonSpec;
  braided: boolean;
  reduced: boolean;
}) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const viewport = useThree((s) => s.viewport);
  const size = useThree((s) => s.size);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uLen: { value: 10 },
      uFill: { value: 0 },
      uBraid: { value: 0 },
      uPhase: { value: index },
      uOffset: { value: 0 },
      uAmp: { value: 0.5 },
      uWide: { value: 0.5 },
      uThin: { value: 0.01 },
      uHelixR: { value: 0.3 },
      uHelixK: { value: 2 },
      uPattern: { value: index },
      uC0: { value: new THREE.Color("#e3187d") },
      uC1: { value: new THREE.Color("#c9a24a") },
      uC2: { value: new THREE.Color("#3a0a22") },
      uLine: { value: new THREE.Color("#3b2a33") },
    }),
    [index],
  );

  const applied = useRef<RibbonSpec>(null);

  useFrame((_, dtRaw) => {
    const u = mat.current?.uniforms;
    if (!u) return;
    // Adopt the product's colours when a slot is filled (keep them while it empties).
    if (spec && spec !== applied.current) {
      applied.current = spec;
      const [a, b, c] = spec.colors;
      (u.uC0.value as THREE.Color).set(a ?? "#e3187d");
      (u.uC1.value as THREE.Color).set(b ?? a ?? "#c9a24a");
      (u.uC2.value as THREE.Color).set(c ?? a ?? "#3a0a22");
      u.uPattern.value = spec.pattern;
    }
    const dt = Math.min(dtRaw, 0.05);
    const vw = viewport.width;
    const vh = viewport.height;
    const narrow = size.width < 640;
    u.uTime.value += dt * (reduced ? 0.15 : 1);
    u.uLen.value = vw * 1.3;
    u.uWide.value = Math.min(vh * (narrow ? 0.12 : 0.17), vw * (narrow ? 0.16 : 0.1));
    u.uThin.value = (2 * vh) / size.height; // ~2 css px
    u.uAmp.value = vh * 0.13;
    u.uOffset.value = (index - 1) * vh * 0.12;
    u.uHelixR.value = u.uWide.value * 0.85;
    u.uHelixK.value = (Math.PI * 2) / (vw / (narrow ? 1.3 : 2.4));
    const k = reduced ? 20 : 1;
    u.uFill.value = THREE.MathUtils.damp(u.uFill.value, spec ? 1 : 0, 3 * k, dt);
    u.uBraid.value = THREE.MathUtils.damp(u.uBraid.value, braided ? 1 : 0, (1.3 + index * 0.25) * k, dt);
  });

  return (
    <mesh frustumCulled={false} renderOrder={index}>
      <planeGeometry args={[1, 1, 280, 1]} />
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        vertexShader={vertex}
        fragmentShader={fragment}
        side={THREE.DoubleSide}
        transparent
      />
    </mesh>
  );
}

export default function WeaveRibbons({ slots, braided }: { slots: RibbonSpec[]; braided: boolean }) {
  const [reduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "120px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrap} className="absolute inset-0">
      <Canvas
        frameloop={visible ? "always" : "never"}
        onCreated={() => setReady(true)}
        className={`transition-opacity duration-1000 ease-out ${ready ? "opacity-100" : "opacity-0"}`}
        style={{ pointerEvents: "none" }}
        dpr={[1, 1.25]}
        camera={{ position: [0, 0, 7], fov: 35 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        aria-hidden
      >
        {[0, 1, 2].map((i) => (
          <Ribbon key={i} index={i} spec={slots[i] ?? null} braided={braided} reduced={reduced} />
        ))}
      </Canvas>
    </div>
  );
}
