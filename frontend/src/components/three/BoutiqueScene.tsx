"use client";
// Hero canvas: the silk curtain parts from the centre, then the camera drifts
// (handheld) down a teal-and-brass boutique corridor lined with scalloped
// niches of hanging lehengas, while two models walk out of the side doorways,
// turn and sit on the magenta velvet sofa. The lens lengthens near the end.
// Driven by `progress` (0..1, the hero's scrubbed ScrollTrigger).
// Desktop: soft PCF shadows (key 2048 + two walk spots), a blurred floor
// reflection and post-processing (N8AO, Bloom, depth of field on the sofa,
// SMAA, vignette, neutral tone mapping). It sheds AO / DoF, then the whole
// composer, if the frame rate drops. Mobile: no shadows, reflector or post.
// "curtain" mode renders only the curtain over a transparent canvas (video).
import { Suspense, useEffect, useMemo, useRef, useState, type RefObject } from "react";
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
import { hasWebGL } from "./WebGLBoundary";
import { shadowTexture } from "./boutiqueTextures";
import { BEATS, HALL, SOFA, curtainOpen, remap, sineInOut } from "./boutiqueLayout";

const FOG = "#0d2c2a";
const FOCUS = new THREE.Vector3(0, 0.95, SOFA.hipZ);

/** Dolly down the hall at eye level with a handheld drift; the lens lengthens at the end. */
function Rig({ progress, mobile, still }: { progress: RefObject<number>; mobile: boolean; still: boolean }) {
  const look = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    const camera = state.camera as THREE.PerspectiveCamera;
    const clock = state.clock;
    const p = progress.current ?? 0;
    const d = sineInOut(remap(p, BEATS.dolly[0], BEATS.dolly[1]));
    const settle = sineInOut(remap(p, BEATS.settle[0], BEATS.settle[1]));
    const t = still ? 0 : clock.elapsedTime;
    // Handheld: a few slow, incommensurate sines.
    const hx = Math.sin(t * 0.31) * 0.022 + Math.sin(t * 0.83 + 1.3) * 0.008;
    const hy = Math.sin(t * 0.47 + 0.4) * 0.016 + Math.sin(t * 1.13) * 0.005;
    const endX = mobile ? 0 : -1.0;
    const endZ = mobile ? 5.6 : 4.9;
    const sway = Math.sin(d * Math.PI * 2.2) * 0.18 * (1 - settle);
    const fov = THREE.MathUtils.lerp(mobile ? 58 : 46, mobile ? 46 : 31, settle);
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    camera.position.set(
      endX * settle + sway + hx,
      THREE.MathUtils.lerp(1.5, mobile ? 1.05 : 1.2, d) + hy,
      THREE.MathUtils.lerp(HALL.entranceZ - 0.8, endZ, d),
    );
    look.set(
      endX * settle * 1.12 + sway * 0.4 + hx * 0.5,
      THREE.MathUtils.lerp(1.45, mobile ? 0.45 : 0.92, d),
      SOFA.backZ,
    );
    camera.lookAt(look);
    camera.rotateZ(Math.sin(t * 0.37) * 0.003);
  });
  return null;
}

function Lights({ shadows }: { shadows: boolean }) {
  const scene = useThree((s) => s.scene);
  const key = useRef<THREE.SpotLight>(null);
  const walkL = useRef<THREE.SpotLight>(null);
  const walkR = useRef<THREE.SpotLight>(null);
  useEffect(() => {
    const targets: [THREE.SpotLight | null, [number, number, number]][] = [
      [key.current, [0, 0.5, SOFA.hipZ]],
      [walkL.current, [-1.6, 0, -0.2]],
      [walkR.current, [1.6, 0, -0.2]],
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
        position={[0.6, 3.85, 2.4]}
        color="#ffe6c8"
        intensity={70}
        angle={0.62}
        penumbra={1}
        decay={1.6}
        distance={12}
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-radius={6}
      />
      {[
        [walkL, -1.75],
        [walkR, 1.75],
      ].map(([ref, x]) => (
        <spotLight
          key={x as number}
          ref={ref as RefObject<THREE.SpotLight>}
          position={[x as number, 3.85, 1.6]}
          color="#ffdcb4"
          intensity={34}
          angle={0.7}
          penumbra={1}
          decay={1.6}
          distance={9}
          castShadow={shadows}
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0005}
          shadow-normalBias={0.02}
          shadow-radius={5}
        />
      ))}
      {[11.0, 6.4].map((z) => (
        <pointLight key={z} position={[0, 3.2, z]} color="#ffcf9a" intensity={10} distance={9} decay={1.5} />
      ))}
      <pointLight position={[0, 2.6, HALL.chandelierZ]} color="#ffd6a0" intensity={8} distance={6} decay={1.6} />
    </>
  );
}

function Models({ urls, progress, still }: { urls: string[]; progress: RefObject<number>; still: boolean }) {
  const shadow = useMemo(() => shadowTexture(), []);
  return (
    <>
      {urls[0] && <BoutiqueModel url={urls[0]} side={-1} index={0} progress={progress} shadow={shadow} still={still} />}
      {urls[1] && <BoutiqueModel url={urls[1]} side={1} index={1} progress={progress} shadow={shadow} still={still} />}
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
 * Post stack. AO and depth of field fade out while the curtain is on screen (it is
 * drawn over the hall without depth), and grow gently toward the seated shot.
 */
function Post({ progress, tier }: { progress: RefObject<number>; tier: number }) {
  const dof = useRef<DepthOfFieldEffect>(null);
  useFrame(() => {
    const p = progress.current ?? 0;
    const visible = curtainOpen(p) >= 1 ? 1 : 0;
    if (dof.current) dof.current.bokehScale = visible * (0.8 + 1.8 * remap(p, 0.5, 0.95));
  });
  const full = tier >= 2;
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {full ? (
        <N8AO halfRes quality="performance" aoRadius={0.6} distanceFalloff={0.6} intensity={2.2} color="#06201e" />
      ) : (
        <></>
      )}
      <Bloom mipmapBlur luminanceThreshold={0.95} luminanceSmoothing={0.2} intensity={0.75} radius={0.7} />
      {full ? <DepthOfField ref={dof} target={FOCUS} focalLength={0.05} bokehScale={0} height={480} /> : <></>}
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      <SMAA />
      <Vignette eskil={false} offset={0.28} darkness={0.55} />
    </EffectComposer>
  );
}

/** Re-renders when the curtain finishes so the post stack can add the AO pass. */
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

export default function BoutiqueScene({
  progress,
  mode,
  models,
  onReady,
}: {
  progress: RefObject<number>;
  mode: "hall" | "curtain";
  models: string[];
  onReady?: () => void;
}) {
  // Client-only (ssr:false), so window is available for these one-time checks.
  const [env] = useState(() => ({
    gl: hasWebGL(),
    mobile: window.matchMedia("(max-width: 767px)").matches,
    still: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  }));
  if (!env.gl) throw new Error("WebGL unavailable");

  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);
  // Quality tier: 2 = full post, 1 = bloom/SMAA/vignette only, 0 = no composer.
  const [tier, setTier] = useState(env.mobile ? 0 : 2);
  const wrap = useRef<HTMLDivElement>(null);
  const hall = mode === "hall";
  const curtainDone = useCurtainDone(progress, hall && tier > 0);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const frameloop = !visible ? "never" : env.still ? "demand" : "always";
  const shadows = hall && !env.mobile;

  return (
    <div ref={wrap} className="absolute inset-0">
      <Canvas
        frameloop={frameloop}
        shadows={shadows ? { type: THREE.PCFShadowMap } : false}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NeutralToneMapping;
          gl.toneMappingExposure = 1.0;
          setReady(true);
          onReady?.();
        }}
        className={`transition-opacity duration-[1200ms] ease-out ${ready ? "opacity-100" : "opacity-0"}`}
        style={{ pointerEvents: "none" }}
        dpr={env.mobile ? [1, 1.25] : [1, 1.5]}
        camera={{ position: [0, 1.5, HALL.entranceZ - 0.8], fov: env.mobile ? 58 : 46, near: 0.1, far: 60 }}
        gl={{ antialias: env.mobile, alpha: !hall, powerPreference: "high-performance", stencil: false }}
        aria-hidden
      >
        <CameraLayers />
        <Rig progress={progress} mobile={env.mobile} still={env.still} />
        {hall && (
          <>
            <PerformanceMonitor
              bounds={() => [45, 90]}
              flipflops={2}
              onDecline={() => setTier((t) => Math.max(0, t - 1))}
            />
            <color attach="background" args={[FOG]} />
            <fog attach="fog" args={[FOG, 9, 34]} />
            <Lights shadows={shadows} />
            <Environment resolution={128} frames={1} environmentIntensity={0.6}>
              <Lightformer form="rect" intensity={2.2} color="#fff0dc" position={[0, 4, 0]} rotation-x={Math.PI / 2} scale={[4, 14, 1]} />
              <Lightformer form="rect" intensity={1.2} color="#2bb3a4" position={[-4, 2, 0]} rotation-y={Math.PI / 2} scale={[14, 3, 1]} />
              <Lightformer form="rect" intensity={1.2} color="#ff8fbf" position={[4, 2, 0]} rotation-y={-Math.PI / 2} scale={[14, 3, 1]} />
              <Lightformer form="circle" intensity={6} color="#ffd9a0" position={[0, 3, -3]} scale={1.5} />
            </Environment>
            <BoutiqueHall mobile={env.mobile} />
            <BoutiqueGarments mobile={env.mobile} />
            <BoutiqueFurniture />
            <Suspense fallback={null}>
              <Models urls={models} progress={progress} still={env.still} />
            </Suspense>
            {tier > 0 && <Post progress={progress} tier={curtainDone ? tier : Math.min(tier, 1)} />}
          </>
        )}
        <SilkCurtain progress={progress} />
      </Canvas>
    </div>
  );
}
