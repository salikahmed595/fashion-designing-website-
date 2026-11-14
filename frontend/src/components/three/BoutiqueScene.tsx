"use client";
// Hero canvas: the silk curtain parts from the centre, then the camera dollies
// down the procedural boutique hallway while two models walk out of the side
// doorways and sit on the sofa at the far end. Everything is driven by
// `progress` (0..1, the hero's scrubbed ScrollTrigger). In "curtain" mode only
// the curtain renders, over a transparent canvas (used when a video is set).
// Renders only while on screen; reduced motion shows the final frame on demand.
import { Suspense, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import SilkCurtain, { CURTAIN_LAYER } from "./SilkCloth";
import BoutiqueHall from "./BoutiqueHall";
import BoutiqueModel from "./BoutiqueModel";
import { hasWebGL } from "./WebGLBoundary";
import { shadowTexture } from "./boutiqueTextures";
import { BEATS, HALL, SOFA, remap, sineInOut } from "./boutiqueLayout";

const FOG = "#3a2219";

/** Moves the camera down the hall with a gentle sway, settling on the sofa. */
function Rig({
  progress,
  mobile,
  still,
}: {
  progress: RefObject<number>;
  mobile: boolean;
  still: boolean;
}) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const look = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }) => {
    const p = progress.current ?? 0;
    const d = sineInOut(remap(p, BEATS.dolly[0], BEATS.dolly[1]));
    const settle = sineInOut(remap(p, BEATS.settle[0], BEATS.settle[1]));
    const t = still ? 0 : clock.elapsedTime;
    // Desktop frames the sofa right of centre to leave room for the headline.
    const endX = mobile ? 0 : -1.1;
    const endZ = mobile ? 4.6 : 3.55;
    const sway = Math.sin(d * Math.PI * 2.2) * 0.22 * (1 - settle);
    camera.position.set(
      endX * settle + sway + Math.sin(t * 0.35) * 0.025,
      THREE.MathUtils.lerp(1.7, mobile ? 1.0 : 1.22, d) + Math.sin(t * 0.5) * 0.015,
      THREE.MathUtils.lerp(HALL.entranceZ - 0.6, endZ, d),
    );
    look.set(
      endX * settle * 1.12 + sway * 0.4,
      THREE.MathUtils.lerp(1.65, mobile ? 0.35 : 0.95, d),
      SOFA.backZ,
    );
    camera.lookAt(look);
  });
  return null;
}

function Lights() {
  const spot = useRef<THREE.SpotLight>(null);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const l = spot.current;
    if (!l) return;
    l.target.position.set(0, 0.6, -0.9);
    scene.add(l.target);
    return () => void scene.remove(l.target);
  }, [scene]);
  return (
    <>
      <hemisphereLight args={["#ffe2bf", "#4a1826", 0.45]} />
      <ambientLight color="#ffd0a0" intensity={0.12} />
      {/* Two warm pools down the hall (kept few for a steady frame rate). */}
      {[11, 4.6].map((z) => (
        <pointLight key={z} position={[0, 3.9, z]} color="#ffc37e" intensity={18} distance={12} decay={1.4} />
      ))}
      <spotLight
        ref={spot}
        position={[0, 4.8, 2.4]}
        color="#ffe2bd"
        intensity={42}
        angle={0.55}
        penumbra={0.9}
        decay={1.3}
        distance={12}
      />
      <pointLight position={[0, 2.2, -1.9]} color="#ffb070" intensity={6} distance={5} decay={1.5} />
    </>
  );
}

function Models({ urls, progress }: { urls: string[]; progress: RefObject<number> }) {
  const shadow = useMemo(() => shadowTexture(), []);
  return (
    <>
      {urls[0] && <BoutiqueModel url={urls[0]} side={-1} index={0} progress={progress} shadow={shadow} />}
      {urls[1] && <BoutiqueModel url={urls[1]} side={1} index={1} progress={progress} shadow={shadow} />}
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
  const wrap = useRef<HTMLDivElement>(null);
  const hall = mode === "hall";

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const frameloop = !visible ? "never" : env.still ? "demand" : "always";

  return (
    <div ref={wrap} className="absolute inset-0">
      <Canvas
        frameloop={frameloop}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 0.95;
          setReady(true);
          onReady?.();
        }}
        className={`transition-opacity duration-[1200ms] ease-out ${ready ? "opacity-100" : "opacity-0"}`}
        style={{ pointerEvents: "none" }}
        dpr={env.mobile ? [1, 1.25] : [1, 1.5]}
        camera={{ position: [0, 1.7, HALL.entranceZ - 0.6], fov: env.mobile ? 52 : 45, near: 0.1, far: 60 }}
        gl={{ antialias: !env.mobile, alpha: !hall, powerPreference: "high-performance" }}
        aria-hidden
      >
        <CameraLayers />
        <Rig progress={progress} mobile={env.mobile} still={env.still} />
        {hall && (
          <>
            <color attach="background" args={[FOG]} />
            <fog attach="fog" args={[FOG, 4, 26]} />
            <Lights />
            <Environment resolution={64} frames={1} environmentIntensity={0.55}>
              <Lightformer form="rect" intensity={2} color="#ffd9a8" position={[0, 4, 0]} rotation-x={Math.PI / 2} scale={[6, 10, 1]} />
              <Lightformer form="rect" intensity={1} color="#ff9fb8" position={[-4, 2, 0]} rotation-y={Math.PI / 2} scale={[10, 3, 1]} />
              <Lightformer form="rect" intensity={1} color="#ffcf8a" position={[4, 2, 0]} rotation-y={-Math.PI / 2} scale={[10, 3, 1]} />
            </Environment>
            <BoutiqueHall mobile={env.mobile} />
            <Suspense fallback={null}>
              <Models urls={models} progress={progress} />
            </Suspense>
          </>
        )}
        <SilkCurtain progress={progress} />
      </Canvas>
    </div>
  );
}
