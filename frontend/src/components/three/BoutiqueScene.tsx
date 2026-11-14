"use client";
// Hero canvas: the silk curtain parts from the centre, then the camera drifts
// (handheld) down a teal-and-brass boutique corridor lined with scalloped
// niches of hanging lehengas, while two models walk out of the side doorways,
// turn and sit on the magenta velvet sofa. Driven by `progress` (0..1, the
// hero's scrubbed ScrollTrigger).
//
// Quality tiers (see quality.ts), chosen once per visit:
//  - low (integrated GPUs, phones, reduced motion): no post, no shadow maps,
//    no reflector, standard materials, fewer garments, DPR 1, capped at 30 fps
//    with a demand loop;
//  - medium: key-light shadow (1024), cheap bloom, reflector at 256, DPR 1.25;
//  - high: full look (three shadowed spots, N8AO, bloom, DoF, SMAA, vignette).
// A performance monitor sheds post and shadows quickly if frames drop. Nothing
// renders while the hero is off screen or the tab is hidden (the clock stops).
// "curtain" mode renders only the curtain over a transparent canvas (video),
// and stops once the curtain has gone.
import { Suspense, lazy, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import { Bloom, DepthOfField, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode, type DepthOfFieldEffect } from "postprocessing";
import * as THREE from "three";
import SilkCurtain, { CURTAIN_LAYER } from "./SilkCloth";
import BoutiqueHall from "./BoutiqueHall";
import BoutiqueGarments from "./BoutiqueGarments";
import BoutiqueFurniture from "./BoutiqueFurniture";
import BoutiqueModel from "./BoutiqueModel";
import { WebGLBoundary, hasWebGL } from "./WebGLBoundary";
import { shadowTexture } from "./boutiqueTextures";
import { BEATS, FINAL_CAM, HALL, SOFA, curtainOpen, remap, sineInOut } from "./boutiqueLayout";
import { detectQuality, type Quality } from "./quality";

// The GLTF loader only downloads when rigged models are actually configured.
const BoutiqueRiggedModel = lazy(() => import("./BoutiqueRiggedModel"));

const FOG = "#0d2c2a";
const FOCUS = new THREE.Vector3(0, 0.95, SOFA.hipZ);

/** Dolly down the hall at eye level with a handheld drift; the lens lengthens at the end. */
function Rig({ progress, narrow, still }: { progress: RefObject<number>; narrow: boolean; still: boolean }) {
  const look = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    const camera = state.camera as THREE.PerspectiveCamera;
    const p = progress.current ?? 0;
    const d = sineInOut(remap(p, BEATS.dolly[0], BEATS.dolly[1]));
    const settle = sineInOut(remap(p, BEATS.settle[0], BEATS.settle[1]));
    const t = still ? 0 : state.clock.elapsedTime;
    // Handheld: a few slow, incommensurate sines.
    const hx = Math.sin(t * 0.31) * 0.022 + Math.sin(t * 0.83 + 1.3) * 0.008;
    const hy = Math.sin(t * 0.47 + 0.4) * 0.016 + Math.sin(t * 1.13) * 0.005;
    const f = narrow ? FINAL_CAM.narrow : FINAL_CAM.wide;
    const sway = Math.sin(d * Math.PI * 2.2) * 0.18 * (1 - settle);
    const fov = THREE.MathUtils.lerp(narrow ? 58 : 46, f.fov, settle);
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    camera.position.set(
      f.x * settle + sway + hx,
      THREE.MathUtils.lerp(1.5, f.y, d) + hy,
      THREE.MathUtils.lerp(HALL.entranceZ - 0.8, f.z, d),
    );
    look.set(
      f.lookX * settle + sway * 0.4 + hx * 0.5,
      THREE.MathUtils.lerp(1.45, f.lookY, d),
      THREE.MathUtils.lerp(SOFA.backZ - 8, SOFA.hipZ - 1.2, settle),
    );
    camera.lookAt(look);
    camera.rotateZ(Math.sin(t * 0.37) * 0.003);
  });
  return null;
}

function Lights({
  keyShadow,
  walkShadows,
  keyMap,
  lite,
}: {
  keyShadow: boolean;
  walkShadows: boolean;
  keyMap: number;
  /** Low tier: fewer lights (every light costs on every lit pixel). */
  lite: boolean;
}) {
  const scene = useThree((s) => s.scene);
  const key = useRef<THREE.SpotLight>(null);
  const walkL = useRef<THREE.SpotLight>(null);
  const walkR = useRef<THREE.SpotLight>(null);
  useEffect(() => {
    const targets: [THREE.SpotLight | null, [number, number, number]][] = [
      [key.current, [0, 0.6, SOFA.hipZ]],
      [walkL.current, [-1.4, 0, SOFA.seatFrontZ + 0.4]],
      [walkR.current, [1.4, 0, SOFA.seatFrontZ + 0.4]],
    ];
    for (const [l, pos] of targets) {
      if (!l) continue;
      l.target.position.set(...pos);
      scene.add(l.target);
    }
    return () => {
      for (const [l] of targets) if (l) scene.remove(l.target);
    };
  }, [scene]);
  return (
    <>
      <hemisphereLight args={["#fff0de", "#0d3a37", 0.5]} />
      <spotLight
        ref={key}
        position={[0.5, 3.85, SOFA.hipZ + 2.6]}
        color="#ffe6c8"
        intensity={70}
        angle={0.62}
        penumbra={1}
        decay={1.6}
        distance={12}
        castShadow={keyShadow}
        shadow-mapSize={[keyMap, keyMap]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-radius={6}
      />
      {(lite ? [] : [
        [walkL, -1.75],
        [walkR, 1.75],
      ]).map(([ref, x]) => (
        <spotLight
          key={x as number}
          ref={ref as RefObject<THREE.SpotLight>}
          position={[x as number, 3.85, SOFA.seatFrontZ + 1.6]}
          color="#ffdcb4"
          intensity={34}
          angle={0.7}
          penumbra={1}
          decay={1.6}
          distance={9}
          castShadow={walkShadows}
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0005}
          shadow-normalBias={0.02}
          shadow-radius={5}
        />
      ))}
      {(lite ? [8.5] : [11.0, 6.4]).map((z) => (
        <pointLight key={z} position={[0, 3.2, z]} color="#ffcf9a" intensity={lite ? 16 : 10} distance={lite ? 14 : 9} decay={1.5} />
      ))}
      {!lite && <pointLight position={[0, 2.6, HALL.chandelierZ]} color="#ffd6a0" intensity={8} distance={6} decay={1.6} />}
    </>
  );
}

type ModelsProps = {
  cutouts: string[];
  rigged: string[];
  progress: RefObject<number>;
  still: boolean;
  castShadows: boolean;
};

/**
 * Which rigged URLs actually exist: one HEAD request each before the GLTF loader
 * is touched, so a missing file costs one 404 line instead of loader errors.
 */
function useAvailable(urls: string[]) {
  const key = urls.join("|");
  const [ok, setOk] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (!key) return;
    let alive = true;
    for (const url of key.split("|")) {
      fetch(url, { method: "HEAD" })
        .then((r) => r.ok)
        .catch(() => false)
        .then((exists) => alive && setOk((prev) => ({ ...prev, [url]: exists })));
    }
    return () => {
      alive = false;
    };
  }, [key]);
  return ok;
}

/** Rigged GLB when configured and present (medium/high), else / meanwhile / on failure the cut-out. */
function Models({ cutouts, rigged, progress, still, castShadows }: ModelsProps) {
  const shadow = useMemo(() => shadowTexture(), []);
  const available = useAvailable(rigged);
  return (
    <>
      {([0, 1] as const).map((i) => {
        const side = i === 0 ? -1 : 1;
        const cut: ReactNode = cutouts[i] ? (
          <Suspense fallback={null}>
            <BoutiqueModel
              url={cutouts[i]}
              side={side}
              index={i}
              progress={progress}
              shadow={shadow}
              still={still}
              castShadows={castShadows}
            />
          </Suspense>
        ) : null;
        if (!rigged[i] || !available[rigged[i]]) return <group key={i}>{cut}</group>;
        return (
          <WebGLBoundary key={i} fallback={cut}>
            <Suspense fallback={cut}>
              <BoutiqueRiggedModel
                url={rigged[i]}
                side={side}
                index={i}
                progress={progress}
                still={still}
                castShadows={castShadows}
              />
            </Suspense>
          </WebGLBoundary>
        );
      })}
    </>
  );
}

/** Puts the curtain layer on the main camera so it renders (the reflector camera skips it). */
function CameraLayers() {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    camera.layers.enable(CURTAIN_LAYER);
  }, [camera]);
  return null;
}

/**
 * Demand-mode frame driver: invalidates at most `fps` times a second while
 * `active`, and only while something changes: always for the hall; for the
 * curtain-only canvas just until the curtain is gone (or the scroll moves); a
 * still (reduced-motion) visit only while things load. Pauses the clock when
 * inactive.
 */
function FrameDriver({
  fps,
  active,
  progress,
  hall,
  still,
}: {
  fps: number;
  active: boolean;
  progress: RefObject<number>;
  hall: boolean;
  still: boolean;
}) {
  const get = useThree((s) => s.get);
  useEffect(() => {
    const clock = get().clock;
    if (!active) {
      clock.stop();
      return;
    }
    // Resume without resetting elapsed time (keeps the handheld drift continuous).
    clock.running = true;
    clock.oldTime = performance.now();
    const t0 = performance.now();
    let lastP = -1;
    let raf = 0;
    let last = 0;
    const wants = () => {
      const p = progress.current ?? 0;
      const moved = p !== lastP;
      lastP = p;
      if (still) return moved || performance.now() - t0 < 4000;
      if (!hall) return moved || curtainOpen(p) < 1;
      return true;
    };
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (t - last < 1000 / fps - 2) return;
      last = t;
      if (wants()) get().invalidate();
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, fps, get, progress, hall, still]);
  return null;
}

/**
 * Post stack. `fx` 3 = full (AO, bloom, DoF, SMAA, vignette), 2 = cheap bloom
 * + vignette. AO and DoF stay off until the curtain has gone (it is drawn over
 * the hall without depth); DoF grows toward the seated shot.
 */
function Post({ progress, fx, curtainDone }: { progress: RefObject<number>; fx: number; curtainDone: boolean }) {
  const dof = useRef<DepthOfFieldEffect>(null);
  useFrame(() => {
    const p = progress.current ?? 0;
    const visible = curtainOpen(p) >= 1 ? 1 : 0;
    if (dof.current) dof.current.bokehScale = visible * (0.8 + 1.8 * remap(p, 0.5, 0.95));
  });
  const full = fx >= 3 && curtainDone;
  return (
    <EffectComposer multisampling={0} enableNormalPass={false} resolutionScale={fx >= 3 ? 1 : 0.75}>
      {full ? (
        <N8AO halfRes quality="performance" aoRadius={0.6} distanceFalloff={0.6} intensity={2.2} color="#06201e" />
      ) : (
        <></>
      )}
      <Bloom
        mipmapBlur
        luminanceThreshold={0.95}
        luminanceSmoothing={0.2}
        intensity={fx >= 3 ? 0.75 : 0.6}
        radius={0.7}
        levels={fx >= 3 ? 8 : 4}
        resolutionScale={fx >= 3 ? 0.5 : 0.25}
      />
      {full ? <DepthOfField ref={dof} target={FOCUS} focalLength={0.05} bokehScale={0} height={480} /> : <></>}
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      {fx >= 3 ? <SMAA /> : <></>}
      <Vignette eskil={false} offset={0.28} darkness={0.55} />
    </EffectComposer>
  );
}

/** Polls (4x a second) whether the curtain has finished, for the post stack. */
function useCurtainDone(progress: RefObject<number>, enabled: boolean) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let timer = 0;
    const tick = () => {
      const d = (progress.current ?? 0) >= BEATS.curtain[1];
      setDone((prev) => (prev === d ? prev : d));
      timer = window.setTimeout(tick, 250);
    };
    timer = window.setTimeout(tick, 0);
    return () => window.clearTimeout(timer);
  }, [progress, enabled]);
  return done;
}

const TIER = {
  low: { fx: 0, dpr: 1 as number | [number, number], fps: 30, fog: [6, 22] as const },
  medium: { fx: 2, dpr: [1, 1.25] as [number, number], fps: 0, fog: [9, 34] as const },
  high: { fx: 3, dpr: [1, 1.5] as [number, number], fps: 0, fog: [9, 34] as const },
};

export default function BoutiqueScene({
  progress,
  mode,
  models,
  rigged = [],
  onReady,
}: {
  progress: RefObject<number>;
  mode: "hall" | "curtain";
  /** Transparent cut-out image URLs (always the fallback). */
  models: string[];
  /** Rigged GLB URLs (used on medium/high only). */
  rigged?: string[];
  onReady?: () => void;
}) {
  // Client-only (ssr:false), so window is available for these one-time checks.
  const [env] = useState(() => ({
    gl: hasWebGL(),
    quality: detectQuality() as Quality,
    narrow: window.matchMedia("(max-width: 767px)").matches,
    still: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  }));
  if (!env.gl) throw new Error("WebGL unavailable");
  const q = env.quality;
  const tier = TIER[q];

  const [ready, setReady] = useState(false);
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  // Effects level, lowered by the performance monitor: 3 full post, 2 cheap bloom,
  // 1 no post (shadows kept), 0 no post and no shadows.
  const [fx, setFx] = useState(tier.fx);
  const wrap = useRef<HTMLDivElement>(null);
  const hall = mode === "hall";
  const curtainDone = useCurtainDone(progress, hall && fx >= 3);
  const active = inView && pageVisible;

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting));
    io.observe(el);
    const vis = () => setPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", vis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);

  const demand = !hall || q === "low" || env.still;
  const frameloop = !active ? "never" : demand ? "demand" : "always";

  const shadows = hall && q !== "low" && fx >= 1;
  const keyMap = q === "high" ? 2048 : 1024;
  const rich = q !== "low";
  const blob = useMemo(() => shadowTexture(), []);

  return (
    <div ref={wrap} className="absolute inset-0">
      <Canvas
        frameloop={frameloop}
        shadows={shadows ? { type: THREE.PCFShadowMap } : false}
        onCreated={({ gl, scene }) => {
          gl.toneMapping = THREE.NeutralToneMapping;
          gl.toneMappingExposure = 1.0;
          if (process.env.NODE_ENV !== "production") {
            // Dev-only handles for profiling in the browser console.
            Object.assign(window, { __heroGL: gl, __heroScene: scene });
          }
          setReady(true);
          onReady?.();
        }}
        className={`transition-opacity duration-[1200ms] ease-out ${ready ? "opacity-100" : "opacity-0"}`}
        style={{ pointerEvents: "none" }}
        dpr={tier.dpr}
        camera={{ position: [0, 1.5, HALL.entranceZ - 0.8], fov: env.narrow ? 58 : 46, near: 0.1, far: 60 }}
        gl={{ antialias: false, alpha: !hall, powerPreference: q === "low" ? "low-power" : "high-performance", stencil: false }}
        aria-hidden
      >
        {demand && (
          <FrameDriver fps={q === "low" || !hall ? 30 : 60} active={active} progress={progress} hall={hall} still={env.still} />
        )}
        <CameraLayers />
        <Rig progress={progress} narrow={env.narrow} still={env.still} />
        {hall && (
          <>
            {q !== "low" && (
              <PerformanceMonitor
                ms={250}
                iterations={8}
                threshold={0.6}
                bounds={() => [50, 75]}
                onDecline={() => setFx((f) => Math.max(0, f - 1))}
              />
            )}
            <color attach="background" args={[FOG]} />
            <fog attach="fog" args={[FOG, tier.fog[0], tier.fog[1]]} />
            <Lights keyShadow={shadows} walkShadows={shadows && q === "high" && fx >= 2} keyMap={keyMap} lite={q === "low"} />
            <Environment resolution={q === "low" ? 32 : 128} frames={1} environmentIntensity={0.6}>
              <Lightformer form="rect" intensity={2.2} color="#fff0dc" position={[0, 4, 0]} rotation-x={Math.PI / 2} scale={[4, 14, 1]} />
              <Lightformer form="rect" intensity={1.2} color="#2bb3a4" position={[-4, 2, 0]} rotation-y={Math.PI / 2} scale={[14, 3, 1]} />
              <Lightformer form="rect" intensity={1.2} color="#ff8fbf" position={[4, 2, 0]} rotation-y={-Math.PI / 2} scale={[14, 3, 1]} />
              <Lightformer form="circle" intensity={6} color="#ffd9a0" position={[0, 3, -3]} scale={1.5} />
            </Environment>
            <BoutiqueHall quality={q} />
            <BoutiqueGarments quality={q} />
            <BoutiqueFurniture rich={rich} blob={blob} />
            <Models
              cutouts={models}
              rigged={q === "low" ? [] : rigged}
              progress={progress}
              still={env.still}
              castShadows={shadows}
            />
            {fx >= 2 && <Post progress={progress} fx={fx} curtainDone={curtainDone} />}
          </>
        )}
        <SilkCurtain progress={progress} />
      </Canvas>
      {/* Low tier has no post stack: a free CSS vignette instead. */}
      {hall && fx < 2 && (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_45%,transparent_55%,rgba(4,18,17,0.55))]" />
      )}
    </div>
  );
}
