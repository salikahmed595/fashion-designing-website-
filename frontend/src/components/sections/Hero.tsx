"use client";
// Section 1: one pinned, scroll-scrubbed scene. A silk curtain parts from the
// centre and gathers to the sides; the camera dollies down a 3D boutique hallway
// to a backlit walk-in wardrobe in the big end arch whose glass doors open; the
// headline rises in bottom-left. At the end the 3D fades into the light 2D page
// (paper veil, the headline crossfades to ink). With `hero.video` set, a
// scroll-scrubbed video replaces the hallway (the curtain still opens over it).
// Fallbacks: no WebGL -> still photo + CSS curtain; reduced motion -> no pin, the
// open wardrobe with the copy. Then the heritage panel and marquee band.
import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { HomeContent } from "@/lib/types";
import { WebGLBoundary } from "@/components/three/WebGLBoundary";
import { Marquee } from "./hero/Marquee";
import { CssCurtain } from "./hero/CssCurtain";
import { BEATS } from "@/components/three/boutiqueLayout";

gsap.registerPlugin(ScrollTrigger, useGSAP);

// WebGL only runs in the browser.
const BoutiqueScene = dynamic(() => import("@/components/three/BoutiqueScene"), { ssr: false });

export function Hero({
  hero,
  heritage,
  marquee,
  wardrobe,
}: {
  hero: HomeContent["hero"];
  heritage: HomeContent["heritage"];
  marquee: HomeContent["marquee"];
  /** Hanger cut-out URLs (product images) that fill the wardrobe at the end of the hallway. */
  wardrobe: string[];
}) {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const progress = useRef(0);
  const [glReady, setGlReady] = useState(false);
  const [glFailed, setGlFailed] = useState(false);
  const hasVideo = typeof hero.video === "string" && hero.video.trim() !== "";

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          reduce: "(prefers-reduced-motion: reduce)",
          mobile: "(max-width: 767px)",
        },
        (ctx) => {
          const { motion, mobile } = ctx.conditions as Record<string, boolean>;

          if (!motion) {
            // Reduced motion: no pin; the open wardrobe and the copy.
            progress.current = BEATS.fade[0];
            gsap.set("[data-css-curtain], [data-cue]", { autoAlpha: 0 });
            gsap.set("[data-shade]", { autoAlpha: 1 });
            const v = video.current;
            if (v) {
              const toEnd = () => v.duration && (v.currentTime = v.duration * 0.999);
              if (v.readyState >= 1) toEnd();
              else v.addEventListener("loadedmetadata", toEnd, { once: true });
            }
            return;
          }

          const proxy = { p: 0 };
          const scrubVideo = () => {
            const v = video.current;
            if (v && v.readyState >= 1 && v.duration) v.currentTime = proxy.p * v.duration * 0.999;
          };
          const tl = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: stage.current,
              start: "top top",
              end: mobile ? "+=180%" : "+=280%",
              pin: true,
              scrub: 1,
              anticipatePin: 1,
            },
          });
          tl.to(
            proxy,
            {
              p: 1,
              duration: 1,
              onUpdate: () => {
                progress.current = proxy.p;
                scrubVideo();
              },
            },
            0,
          )
            .to("[data-cue]", { autoAlpha: 0, y: 16, duration: 0.05 }, 0)
            // CSS curtain (fallback / until WebGL is ready): gather, then slide off.
            .to("[data-css-half='l']", { scaleX: 0.14, duration: 0.24, ease: "power2.inOut" }, 0)
            .to("[data-css-half='r']", { scaleX: 0.14, duration: 0.24, ease: "power2.inOut" }, 0)
            .to("[data-css-half='l']", { xPercent: -100, duration: 0.1, ease: "power2.in" }, 0.2)
            .to("[data-css-half='r']", { xPercent: 100, duration: 0.1, ease: "power2.in" }, 0.2)
            .fromTo("[data-still]", { scale: 1.18 }, { scale: 1, duration: 0.9, ease: "power2.out" }, 0)
            .fromTo("[data-shade]", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.12 }, 0.24)
            .fromTo(
              "[data-reveal]",
              { y: 48, autoAlpha: 0 },
              { y: 0, autoAlpha: 1, duration: 0.12, stagger: 0.025, ease: "power3.out" },
              0.28,
            )
            // The end: the 3D fades into the light page and the copy turns ink.
            .to("[data-shade], [data-copy='dark']", { autoAlpha: 0, duration: BEATS.fade[1] - BEATS.fade[0] }, BEATS.fade[0])
            .fromTo("[data-veil], [data-copy='light']", { autoAlpha: 0 }, { autoAlpha: 1, duration: BEATS.fade[1] - BEATS.fade[0] }, BEATS.fade[0]);

          // Heritage: slow Ken Burns zoom across its scroll pass, copy rises in.
          gsap.fromTo(
            "[data-heritage-img]",
            { scale: 1.2 },
            {
              scale: 1,
              ease: "none",
              scrollTrigger: { trigger: "[data-heritage]", start: "top bottom", end: "bottom top", scrub: true },
            },
          );
          gsap.from("[data-heritage-text] > *", {
            y: 36,
            autoAlpha: 0,
            duration: 1.1,
            stagger: 0.12,
            ease: "expo.out",
            scrollTrigger: { trigger: "[data-heritage]", start: "top 55%", once: true },
          });

          return () => {
            progress.current = 0;
          };
        },
      );
    },
    { scope: root },
  );

  const showStill = glFailed;

  return (
    <section id="top" ref={root} className="relative scroll-mt-24 bg-paper">
      {/* ── Pinned stage ── */}
      <div ref={stage} className="relative h-svh min-h-[560px] w-full overflow-hidden bg-[#3a2219]">
        {/* Still photo: the no-WebGL fallback (and the base layer under the canvas). */}
        {!hasVideo && (
          <div data-still className={`absolute inset-0 will-change-transform ${showStill ? "" : "opacity-0"}`}>
            {hero.image ? (
              <Image src={hero.image} alt="" fill preload sizes="100vw" className="object-cover" />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_70%_30%,#b50e62,#3a0a22)]" />
            )}
          </div>
        )}

        {/* Optional walk-through video, scrubbed by scroll. */}
        {hasVideo && (
          <video
            ref={video}
            src={hero.video}
            muted
            playsInline
            preload="auto"
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}

        {/* 3D hallway + silk curtain (curtain only when a video is set). */}
        {!glFailed && (
          <WebGLBoundary onError={() => setGlFailed(true)}>
            <BoutiqueScene
              progress={progress}
              mode={hasVideo ? "curtain" : "hall"}
              wardrobe={wardrobe}
              onReady={() => setGlReady(true)}
            />
          </WebGLBoundary>
        )}

        {/* CSS curtain: shown until the WebGL curtain is ready, and as the fallback. */}
        <CssCurtain hidden={glReady && !glFailed} />

        {/* Readability: soft gradient behind the copy, bottom-left. */}
        <div data-shade className="pointer-events-none absolute inset-0 z-20 opacity-0">
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(90%_70%_at_0%_100%,rgba(26,8,12,0.8),transparent_70%)]" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/15 to-transparent sm:via-transparent" />
        </div>

        {/* End of the journey: a paper veil, so the 3D fades into the 2D site. */}
        <div data-veil className="pointer-events-none invisible absolute inset-0 z-[25] bg-paper opacity-0" />

        <HeroCopy hero={hero} tone="dark" />
        <HeroCopy hero={hero} tone="light" />

        {/* Scroll hint over the closed curtain. */}
        <div
          data-cue
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-[18%] z-40 flex flex-col items-center gap-3 text-center text-gold-soft"
        >
          <span className="rounded-full bg-[#2a0716]/55 px-5 py-2 text-[10px] font-semibold tracking-[0.4em] uppercase backdrop-blur-sm sm:text-[11px]">
            Scroll to step inside
          </span>
          <span className="relative h-10 w-px overflow-hidden bg-gold-soft/30">
            <span className="absolute inset-x-0 top-0 h-1/2 animate-[cue_1.8s_ease-in-out_infinite] bg-gold-soft" />
          </span>
          <style>{`@keyframes cue{0%{transform:translateY(-100%)}100%{transform:translateY(200%)}}`}</style>
        </div>
      </div>

      {/* ── Heritage panel ── */}
      <div data-heritage className="relative h-svh min-h-[520px] overflow-hidden bg-wine">
        {heritage.image && (
          <div data-heritage-img className="absolute inset-0 will-change-transform">
            <Image src={heritage.image} alt="" fill sizes="100vw" className="object-cover" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-black/70 via-black/20 to-transparent" />
        <div data-heritage-text className="relative z-10 mx-auto max-w-7xl px-4 pt-28 text-white sm:px-6 sm:pt-36">
          <p className="flex items-center gap-3 text-[11px] font-semibold tracking-[0.32em] text-gold-soft uppercase sm:text-xs">
            <span className="inline-block h-px w-8 bg-gold" />
            {heritage.eyebrow}
          </p>
          <h2 className="mt-4 max-w-2xl font-display text-4xl leading-[1] font-medium sm:text-6xl lg:text-7xl">
            {heritage.title}
          </h2>
          <p className="mt-5 max-w-md text-sm text-white/85 sm:text-base">{heritage.body}</p>
        </div>
      </div>

      <Marquee words={marquee} />
    </section>
  );
}

/** Headline block; rendered twice (white over the 3D, ink over the paper veil) and crossfaded at the end. */
function HeroCopy({ hero, tone }: { hero: HomeContent["hero"]; tone: "dark" | "light" }) {
  const light = tone === "light";
  return (
    <div
      data-copy={tone}
      aria-hidden={light || undefined}
      className={`pointer-events-none absolute inset-0 z-30 ${light ? "invisible opacity-0" : ""}`}
    >
      <div className={`mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-14 sm:px-6 sm:pb-20 ${light ? "text-ink" : "text-white"}`}>
        <p
          data-reveal={light ? undefined : true}
          className={`flex items-center gap-3 text-[11px] font-semibold tracking-[0.32em] uppercase sm:text-xs ${light ? "text-pink-deep" : "text-gold-soft"}`}
        >
          <span className="inline-block h-px w-8 bg-gold" />
          {hero.eyebrow}
        </p>
        <h1 className="mt-4 max-w-3xl font-display text-[2.7rem] leading-[0.95] font-medium sm:text-6xl lg:text-7xl" role={light ? "presentation" : undefined}>
          <span data-reveal={light ? undefined : true} className="block">
            {hero.title}
          </span>
          <span data-reveal={light ? undefined : true} className={`block italic ${light ? "text-pink" : "text-gold-soft"}`}>
            {hero.titleAccent}
          </span>
        </h1>
        <p data-reveal={light ? undefined : true} className={`mt-5 max-w-md text-sm leading-relaxed sm:text-base ${light ? "text-ink-soft" : "text-white/85"}`}>
          {hero.subtitle}
        </p>
        <div data-reveal={light ? undefined : true} className="pointer-events-auto mt-7 flex flex-wrap items-center gap-3">
          <a
            href={hero.ctaHref}
            tabIndex={light ? -1 : undefined}
            className="group inline-flex items-center gap-3 rounded-full bg-pink py-2 pr-2 pl-6 text-sm font-semibold text-white shadow-[0_10px_30px_-10px_rgba(227,24,125,0.8)] transition-colors hover:bg-pink-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink"
          >
            {hero.ctaLabel}
            <span className="grid size-8 place-items-center rounded-full bg-white/20 transition-transform duration-300 group-hover:translate-x-0.5">
              →
            </span>
          </a>
          {hero.secondaryLabel && (
            <a
              href={hero.secondaryHref}
              tabIndex={light ? -1 : undefined}
              className={`inline-flex items-center rounded-full border px-6 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
                light
                  ? "border-ink/20 text-ink hover:border-pink hover:text-pink focus-visible:outline-pink"
                  : "border-white/40 bg-white/10 text-white hover:bg-white/20 focus-visible:outline-white"
              }`}
            >
              {hero.secondaryLabel}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
