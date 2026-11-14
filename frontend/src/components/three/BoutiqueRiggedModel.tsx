"use client";
// Rigged GLB model for the hero (medium/high tiers, when /models/*.glb exist).
// Loaded lazily (this file pulls in drei's GLTF loader), scaled to ~1.65 m,
// moved along the same path and beats as the cut-outs. Animations are matched
// by name (case-insensitive, contains): "walk" while moving, the first frame of
// "sit" held while standing, "sit" played once onto the seat, then "idle".
// See docs/3d-models.md for how the files are made.
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { clamp01 } from "./boutiqueLayout";
import { newWalkState, smooth, stepWalk, walkPath, type WalkState } from "./boutiqueWalk";

const TARGET_HEIGHT = 1.65;

type Props = {
  url: string;
  side: -1 | 1;
  index: 0 | 1;
  progress: RefObject<number>;
  still: boolean;
  castShadows: boolean;
};

/** Play an action once from its current time and hold the last frame. */
function playOnce(a: THREE.AnimationAction) {
  a.setLoop(THREE.LoopOnce, 1);
  a.clampWhenFinished = true;
  a.setEffectiveTimeScale(1).play();
}

function findClip(names: string[], key: string) {
  const k = key.toLowerCase();
  return names.find((n) => n.toLowerCase().includes(k));
}

export default function BoutiqueRiggedModel({ url, side, index, progress, still, castShadows }: Props) {
  const gltf = useGLTF(url);
  const group = useRef<THREE.Group>(null);
  const state = useRef<WalkState>(newWalkState(index));
  const phase = useRef<"walk" | "stand" | "sit" | "idle">("stand");

  // A per-instance clone (skinned meshes need SkeletonUtils), scaled to height, feet at y = 0.
  const model = useMemo(() => {
    const obj = cloneSkinned(gltf.scene) as THREE.Object3D;
    const box = new THREE.Box3().setFromObject(obj);
    const h = Math.max(box.max.y - box.min.y, 1e-3);
    const s = TARGET_HEIGHT / h;
    obj.scale.setScalar(s);
    obj.position.y = -box.min.y * s;
    obj.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = castShadows;
        mesh.receiveShadow = castShadows;
        mesh.frustumCulled = false;
      }
    });
    return obj;
  }, [gltf.scene, castShadows]);

  const { actions, names, mixer } = useAnimations(gltf.animations, group);
  // Actions are driven imperatively from the frame loop, through a ref.
  const actionsRef = useRef(actions);
  useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);
  const clips = useMemo(
    () => ({ walk: findClip(names, "walk"), sit: findClip(names, "sit"), idle: findClip(names, "idle") }),
    [names],
  );

  // When "sit" finishes, settle into the idle loop.
  useEffect(() => {
    const done = (e: { action: THREE.AnimationAction }) => {
      const acts = actionsRef.current;
      const idle = clips.idle ? acts[clips.idle] : null;
      if (clips.sit && e.action === acts[clips.sit] && idle) {
        idle.reset().fadeIn(0.4).play();
        e.action.fadeOut(0.4);
        phase.current = "idle";
      }
    };
    mixer.addEventListener("finished", done);
    return () => mixer.removeEventListener("finished", done);
  }, [mixer, clips]);

  const curve = useMemo(() => walkPath(side), [side]);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const ahead = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, rawDelta) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(rawDelta, 0.05);
    const st = state.current;
    stepWalk(st, progress.current ?? 0, index, dt, still);

    const w = smooth(clamp01(st.walk));
    curve.getPoint(w, tmp);
    curve.getPoint(Math.min(1, w + 0.02), ahead);
    g.position.set(tmp.x, 0, tmp.z);
    g.visible = st.walk > 0.001;
    // Full 3D heading while walking; turn to face the camera (+z) before sitting.
    const heading = Math.atan2(ahead.x - tmp.x, ahead.z - tmp.z);
    const target = st.walk < 0.999 ? heading : 0;
    let d = target - g.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    g.rotation.y += d * Math.min(1, dt * (st.walk < 0.999 ? 6 : 3));

    // Animation state.
    const acts = actionsRef.current;
    const walk = clips.walk ? acts[clips.walk] : null;
    const sit = clips.sit ? acts[clips.sit] : null;
    const want = st.sit > 0.02 ? "sit" : st.gait > 0.15 ? "walk" : "stand";
    if (want === "walk" && phase.current !== "walk") {
      walk?.reset().fadeIn(0.35).play();
      sit?.fadeOut(0.35);
      phase.current = "walk";
    } else if (want === "stand" && phase.current !== "stand") {
      if (sit) {
        // First frame of stand-to-sit, held: the standing pose.
        sit.reset().setEffectiveTimeScale(0).play();
        sit.fadeIn(0.35);
      }
      walk?.fadeOut(0.35);
      phase.current = "stand";
    } else if (want === "sit" && phase.current === "stand") {
      if (sit) {
        playOnce(sit);
      }
      phase.current = "sit";
    }
    walk?.setEffectiveTimeScale(0.6 + 0.6 * st.gait);
  });

  return (
    <group ref={group} visible={false}>
      <primitive object={model} />
    </group>
  );
}
