"use client";
// Feel the Drape: a 3-column bento. The centre "screen" plays the products like a film (Ken Burns +
// crossfade, 4s each, progress bar); side columns are portrait thumbnail stacks that drift in opposite
// directions on scroll; the grid assembles from scattered, rotated tiles while the section is pinned.
import { useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { Product, SectionCopy } from "@/lib/types";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useCart } from "@/components/cart/CartProvider";
import { ProductMedia } from "./media/ProductMedia";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const SLIDE_MS = 4;
const FADE_MASK = "linear-gradient(to bottom, transparent, #000 20%, #000 80%, transparent)";

/** Repeat the list so a column is always much taller than its window. */
const stackOf = (n: number, reverse: boolean) => {
  const base = Array.from({ length: n }, (_, k) => k);
  if (reverse) base.reverse();
  const out: number[] = [];
  while (out.length < Math.max(6, n)) out.push(...base);
  return out;
};

export function FeelTheDrape({ copy, products }: { copy: SectionCopy; products: Product[] }) {
  const wrap = useRef<HTMLElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const slides = useRef<(HTMLDivElement | null)[]>([]);
  const prev = useRef(-1);
  const tween = useRef<gsap.core.Tween | null>(null);
  const flags = useRef({ inView: true, hover: false });
  const [i, setI] = useState(0);
  const { add } = useCart();
  const n = products.length;
  const current = products[i];

  const sync = () => tween.current?.paused(!flags.current.inView || flags.current.hover);

  // Slide change: crossfade, Ken Burns, progress bar and auto-advance.
  useGSAP(
    () => {
      if (!n) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const el = slides.current[i];
      const old = prev.current >= 0 && prev.current !== i ? slides.current[prev.current] : null;
      if (el) {
        gsap.set(el, { zIndex: 2 });
        gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 1.1, ease: "power2.inOut" });
        const kb = el.querySelector("[data-kb]");
        if (kb && !reduce) gsap.fromTo(kb, { scale: 1.02 }, { scale: 1.16, duration: 8, ease: "none" });
      }
      if (old) {
        gsap.set(old, { zIndex: 1 });
        gsap.to(old, { opacity: 0, duration: 1.1, ease: "power2.inOut" });
      }
      prev.current = i;
      gsap.fromTo("[data-cap]", { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" });
      tween.current?.kill();
      if (n > 1) {
        tween.current = gsap.fromTo(
          bar.current,
          { scaleX: 0 },
          { scaleX: 1, duration: SLIDE_MS, ease: "none", onComplete: () => setI((v) => (v + 1) % n) },
        );
        sync();
      }
    },
    { scope: wrap, dependencies: [i, n] },
  );

  // Pause the film when off-screen; scrubbed assembly + parallax.
  useGSAP(
    () => {
      ScrollTrigger.create({
        trigger: wrap.current,
        start: "top bottom",
        end: "bottom top",
        onToggle: (s) => {
          flags.current.inView = s.isActive;
          sync();
        },
      });
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          "[data-col='l']",
          { yPercent: 0 },
          { yPercent: -32, ease: "none", scrollTrigger: { trigger: wrap.current, start: "top bottom", end: "bottom top", scrub: 0.8 } },
        );
        gsap.fromTo(
          "[data-col='r']",
          { yPercent: -32 },
          { yPercent: 0, ease: "none", scrollTrigger: { trigger: wrap.current, start: "top bottom", end: "bottom top", scrub: 0.8 } },
        );
        const tl = gsap.timeline({
          scrollTrigger: { trigger: pin.current, start: "top top+=64", end: "+=65%", pin: true, scrub: 0.6, anticipatePin: 1 },
        });
        tl.from("[data-tile]", {
          x: (k: number) => (k % 2 ? 1 : -1) * (40 + (k % 5) * 14),
          y: (k: number) => 80 + (k % 4) * 26,
          rotation: (k: number) => (k % 2 ? 1 : -1) * (6 + (k % 3) * 3),
          opacity: 0,
          scale: 0.86,
          stagger: 0.04,
          ease: "power3.out",
        }).from("[data-screen]", { y: 90, scale: 0.88, rotation: -2.5, opacity: 0.2, ease: "power3.out" }, 0)
          .from("[data-cta]", { y: 24, opacity: 0, ease: "power2.out" }, ">-0.2");
      });
    },
    { scope: wrap },
  );

  if (!n) return <section id="drape" className="scroll-mt-24" />;

  const thumb = (k: number, key: string, cls: string) => {
    const p = products[k];
    return (
      <button
        key={key}
        type="button"
        data-tile
        onClick={() => setI(k)}
        aria-label={`Show ${p.name}`}
        aria-current={k === i}
        className={`group relative block aspect-[3/4] w-full shrink-0 overflow-hidden rounded-xl transition-shadow focus-visible:ring-2 focus-visible:ring-pink focus-visible:outline-none ${
          k === i ? "ring-2 ring-pink ring-offset-2 ring-offset-paper" : ""
        } ${cls}`}
      >
        <ProductMedia product={p} sizes="(min-width:1024px) 20vw, 30vw" className="transition-transform duration-700 group-hover:scale-110" />
        <span className={`absolute inset-0 bg-white/0 transition-colors ${k === i ? "" : "group-hover:bg-white/10"}`} />
      </button>
    );
  };

  return (
    <section ref={wrap} id="drape" className="scroll-mt-24 overflow-x-clip py-16 sm:py-24">
      <div ref={pin} className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading copy={copy} align="center" />

        <div className="mt-8 grid items-stretch gap-5 sm:mt-10 md:grid-cols-[1fr_2.3fr_1fr]">
          {/* left column */}
          <div className="relative hidden md:block">
            <div className="absolute inset-0 overflow-hidden" style={{ maskImage: FADE_MASK, WebkitMaskImage: FADE_MASK }}>
              <div data-col="l" className="flex flex-col gap-4">
                {stackOf(n, false).map((k, idx) => thumb(k, `l${idx}`, ""))}
              </div>
            </div>
          </div>

          {/* centre screen */}
          <div className="flex flex-col items-center">
            <div
              data-screen
              className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-wine shadow-[0_30px_80px_-30px_rgba(58,10,34,0.55)]"
              onPointerEnter={() => {
                flags.current.hover = true;
                sync();
              }}
              onPointerLeave={() => {
                flags.current.hover = false;
                sync();
              }}
            >
              {products.map((p, k) => (
                <div
                  key={p.id}
                  ref={(el) => {
                    slides.current[k] = el;
                  }}
                  className="absolute inset-0"
                  style={{ opacity: k === 0 ? 1 : 0 }}
                  aria-hidden={k !== i}
                >
                  <div data-kb className="absolute inset-0">
                    <ProductMedia product={p} sizes="(min-width:768px) 55vw, 92vw" priority={k === 0} />
                  </div>
                </div>
              ))}
              <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-black/60 via-transparent to-black/10" />
              <div className="absolute inset-x-4 bottom-4 z-20 sm:inset-x-6 sm:bottom-6">
                <p data-cap className="font-display text-xl text-white sm:text-3xl" aria-live="polite">
                  {current.name}
                </p>
                <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-white/25">
                  <div ref={bar} className="h-full origin-left rounded-full bg-white" style={{ transform: "scaleX(0)" }} />
                </div>
              </div>
            </div>

            <button
              data-cta
              type="button"
              onClick={() =>
                add(
                  { id: current.id, name: current.name, price: current.price, image: current.images[0]?.src, size: current.sizes[0] },
                  { message: `${current.name} added to your bag` },
                )
              }
              className="mt-6 rounded-full bg-pink px-8 py-3.5 text-sm font-semibold tracking-wide text-white shadow-lg shadow-pink/25 transition-colors hover:bg-pink-deep focus-visible:ring-2 focus-visible:ring-pink focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Purchase the Collection
            </button>
          </div>

          {/* right column */}
          <div className="relative hidden md:block">
            <div className="absolute inset-0 overflow-hidden" style={{ maskImage: FADE_MASK, WebkitMaskImage: FADE_MASK }}>
              <div data-col="r" className="flex flex-col gap-4">
                {stackOf(n, true).map((k, idx) => thumb(k, `r${idx}`, ""))}
              </div>
            </div>
          </div>

          {/* mobile thumbnail strip */}
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 md:hidden">
            {products.map((p, k) => (
              <div key={p.id} className="w-20 shrink-0">
                {thumb(k, `m${k}`, "")}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
