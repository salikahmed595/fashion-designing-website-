"use client";
// Devotion strip: compact heading, then numbered product cards in a horizontal strip
// moved by mouse drag (with momentum), touch swipe, trackpad, or the arrow buttons.
// No scroll-jacking. Cards tilt in 3D by their distance from the strip centre.
// Below: an outlined serif marquee and two buttons. Fits in one screen.
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { Product, SectionCopy } from "@/lib/types";
import { formatPrice, swatchOf } from "@/lib/catalog";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useCart } from "@/components/cart/CartProvider";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const PHRASES = [
  { t: "Ten pieces.", tone: "ink", fill: true },
  { t: "Ten brides.", tone: "pink", fill: true },
  { t: "Every stitch an offering.", tone: "ink", fill: false },
  { t: "Embroidered by hand. Worn in devotion.", tone: "pink", fill: false },
] as const;

export function DevotionStrip({ copy, products }: { copy: SectionCopy; products: Product[] }) {
  const { add, count, setOpen } = useCart();
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [added, setAdded] = useState<number | null>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  // 3D tilt by distance from the strip centre; runs on every scroll frame.
  const tilt = useCallback(() => {
    const t = track.current;
    if (!t) return;
    const box = t.getBoundingClientRect();
    const mid = box.left + box.width / 2;
    t.querySelectorAll<HTMLElement>("[data-dcard]").forEach((c) => {
      const r = c.getBoundingClientRect();
      const d = Math.max(-1, Math.min(1, (r.left + r.width / 2 - mid) / (box.width / 2)));
      c.style.transform = `perspective(1100px) rotateY(${(-d * 18).toFixed(2)}deg) scale(${(1 - Math.abs(d) * 0.06).toFixed(3)})`;
    });
    setEdges({ start: t.scrollLeft < 8, end: t.scrollLeft + t.clientWidth > t.scrollWidth - 8 });
  }, []);

  useEffect(() => {
    const t = track.current;
    if (!t) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tilt);
    };
    tilt();
    t.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      t.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [tilt, products.length]);

  // Mouse drag with momentum (touch/trackpad use native horizontal scrolling).
  const drag = useRef({ id: -1, x: 0, left: 0, moved: false, v: 0, lastX: 0, lastT: 0 });
  const momentum = useRef<gsap.core.Tween | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || e.button !== 0 || !track.current) return;
    momentum.current?.kill();
    drag.current = { id: e.pointerId, x: e.clientX, left: track.current.scrollLeft, moved: false, v: 0, lastX: e.clientX, lastT: e.timeStamp };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const t = track.current;
    if (d.id !== e.pointerId || !t) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 5) {
      d.moved = true;
      try {
        t.setPointerCapture(e.pointerId);
      } catch {
        /* pointer already released */
      }
    }
    if (!d.moved) return;
    t.scrollLeft = d.left - dx;
    const dt = Math.max(1, e.timeStamp - d.lastT);
    d.v = (e.clientX - d.lastX) / dt; // px per ms
    d.lastX = e.clientX;
    d.lastT = e.timeStamp;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    const t = track.current;
    if (d.id !== e.pointerId || !t) return;
    d.id = -1;
    if (!d.moved) return;
    momentum.current = gsap.to(t, { scrollLeft: t.scrollLeft - d.v * 380, duration: 0.9, ease: "power3.out" });
  };
  const onClickCapture = (e: React.MouseEvent) => {
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = false;
    }
  };
  const nudge = (dir: 1 | -1) => {
    const t = track.current;
    if (!t) return;
    momentum.current?.kill();
    momentum.current = gsap.to(t, { scrollLeft: t.scrollLeft + dir * t.clientWidth * 0.7, duration: 0.8, ease: "power3.out" });
  };

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-dcard]", {
          opacity: 0,
          y: 50,
          duration: 1,
          ease: "expo.out",
          stagger: 0.06,
          scrollTrigger: { trigger: track.current, start: "top 85%", once: true },
          onComplete: tilt,
          clearProps: "opacity",
        });
      });
    },
    { scope: root, dependencies: [products.length] },
  );

  const addOne = (p: Product) => {
    add({ id: p.id, name: p.name, price: p.price, image: p.images[0]?.src, size: p.sizes[0] });
    setAdded(p.id);
    setTimeout(() => setAdded((a) => (a === p.id ? null : a)), 2000);
  };

  const strokeFor = (tone: string) => (tone === "pink" ? "var(--pink)" : "var(--ink)");
  const marqueeItems = (
    <div className="flex shrink-0 items-center">
      {PHRASES.map((ph, i) => (
        <span key={i} className="flex items-center">
          <span
            className="px-5 font-display text-3xl leading-none font-semibold whitespace-nowrap italic sm:text-5xl"
            style={{
              color: ph.fill ? strokeFor(ph.tone) : "transparent",
              WebkitTextStroke: ph.fill ? "0" : `1.2px ${strokeFor(ph.tone)}`,
            }}
          >
            {ph.t}
          </span>
          <span className="text-2xl text-gold" aria-hidden="true">✦</span>
        </span>
      ))}
    </div>
  );

  const arrow = "grid h-11 w-11 place-items-center rounded-full border border-ink/15 bg-white text-lg shadow-sm transition hover:border-pink hover:text-pink disabled:opacity-30";

  return (
    <section ref={root} id="devotion" className="relative flex min-h-svh scroll-mt-24 flex-col justify-center pt-20 pb-12">
      <div className="mx-auto flex w-full max-w-7xl items-end justify-between gap-6 px-4 sm:px-6">
        <SectionHeading copy={copy} className="max-w-5xl [&_h2]:sm:text-5xl lg:[&_h2]:text-[3.4rem]" />
        <div className="hidden shrink-0 items-center gap-2 md:flex">
          <span className="mr-2 text-[11px] font-semibold tracking-[0.28em] text-ink-soft/70 uppercase">Drag</span>
          <button type="button" className={arrow} onClick={() => nudge(-1)} disabled={edges.start} aria-label="Previous pieces">←</button>
          <button type="button" className={arrow} onClick={() => nudge(1)} disabled={edges.end} aria-label="Next pieces">→</button>
        </div>
      </div>

      <div
        ref={track}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={onClickCapture}
        tabIndex={0}
        aria-label="Embroidered pieces, scroll horizontally"
        className="no-scrollbar mt-5 flex cursor-grab gap-5 max-md:snap-x max-md:snap-mandatory overflow-x-auto px-4 py-4 outline-none select-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-pink/40 sm:px-6 md:gap-7 md:px-[6vw]"
        style={{ overscrollBehaviorX: "contain" }}
      >
        {products.map((p, i) => {
          const c = swatchOf(p);
          return (
            <article
              key={p.id}
              data-dcard
              className="relative h-[40svh] max-h-[400px] min-h-[300px] w-[68vw] max-w-[290px] shrink-0 snap-center overflow-hidden rounded-[1.6rem] shadow-[0_30px_60px_-30px_rgba(58,10,34,0.6)] will-change-transform md:w-[290px]"
              style={{ background: `linear-gradient(165deg, ${c[0]}, ${c[1]} 60%, ${c[2]})` }}
            >
              {p.images[0] && (
                <Image
                  src={p.images[0].src}
                  alt={p.images[0].alt || p.name}
                  fill
                  draggable={false}
                  sizes="(min-width:768px) 290px, 68vw"
                  className="pointer-events-none object-cover object-[center_15%]"
                />
              )}
              <span className="absolute top-4 left-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold tracking-widest text-ink backdrop-blur">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/55 to-transparent px-5 pt-20 pb-4 text-white">
                {p.categories[0] && <p className="text-[10px] font-semibold tracking-[0.3em] text-gold uppercase">{p.categories[0].name}</p>}
                <h3 className="mt-1 font-display text-xl leading-tight font-semibold">{p.name}</h3>
                {p.shortDescription && <p className="mt-1 line-clamp-2 text-[11px] text-white/75">{p.shortDescription}</p>}
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">
                    {formatPrice(p.price)}
                    {p.onSale && <span className="ml-2 text-[11px] font-normal text-white/60 line-through">{formatPrice(p.regularPrice)}</span>}
                  </p>
                  <button
                    type="button"
                    onClick={() => addOne(p)}
                    className="rounded-full bg-pink px-4 py-2 text-xs font-semibold text-white transition hover:bg-pink-deep focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                  >
                    {added === p.id ? "Added ✓" : "Add to bag"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-3 overflow-hidden" aria-label="Ten pieces. Ten brides. Every stitch an offering. Embroidered by hand. Worn in devotion.">
        <div className="animate-marquee flex w-max" style={{ ["--marquee-duration" as string]: "45s" }} aria-hidden="true">
          {marqueeItems}
          {marqueeItems}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-3 px-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full bg-pink px-7 py-3 text-sm font-semibold text-white transition hover:bg-pink-deep focus-visible:ring-2 focus-visible:ring-pink focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          View bag · {count}
        </button>
        <a
          href="#rail"
          className="rounded-full border border-ink/20 px-7 py-3 text-sm font-semibold text-ink transition hover:border-pink hover:text-pink focus-visible:ring-2 focus-visible:ring-pink focus-visible:outline-none"
        >
          Shop the Rail
        </a>
      </div>
    </section>
  );
}
