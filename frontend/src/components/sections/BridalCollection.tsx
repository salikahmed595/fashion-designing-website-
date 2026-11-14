"use client";
// Bridal Collection: arched cards fanned on a 3D arc (CSS perspective + GSAP). The centre card is
// large, raised and sharp; neighbours tilt, shrink, blur and fade. Auto-advances every 3.5s
// (pauses on hover/focus); arrows, swipe and keyboard also move it.
import { useCallback, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { Product, SectionCopy } from "@/lib/types";
import { formatPrice } from "@/lib/catalog";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useCart } from "@/components/cart/CartProvider";
import { ProductMedia } from "./media/ProductMedia";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const VISIBLE = 3;

export function BridalCollection({ copy, products }: { copy: SectionCopy; products: Product[] }) {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const paused = useRef(false);
  const touchX = useRef<number | null>(null);
  const [active, setActive] = useState(0);
  const { add } = useCart();
  const n = products.length;
  const p = products[active];

  const go = useCallback((dir: number) => n && setActive((a) => (a + dir + n) % n), [n]);

  // Position every card on the arc; animate from wherever it is.
  const layout = useCallback(
    (instant: boolean) => {
      const half = Math.floor(n / 2);
      cards.current.forEach((el, idx) => {
        if (!el) return;
        const d = ((idx - active + n + half) % n) - half;
        const step = el.offsetWidth * 0.62;
        const a = Math.abs(d);
        const vars = {
          xPercent: -50,
          x: d * step,
          y: d === 0 ? -22 : a * a * 16,
          z: d === 0 ? 60 : -a * 90,
          rotateY: -d * 16,
          rotateZ: d * 6,
          scale: d === 0 ? 1.12 : Math.max(0.5, 1 - a * 0.13),
          opacity: a > VISIBLE ? 0 : Math.max(0.15, 1 - a * 0.3),
          filter: `blur(${a * 2.6}px)`,
          zIndex: 20 - a,
          pointerEvents: a > VISIBLE ? ("none" as const) : ("auto" as const),
        };
        const last = Number(el.dataset.d ?? "0");
        const wrapped = Math.abs(d - last) > n / 2;
        el.dataset.d = String(d);
        if (instant || wrapped) gsap.set(el, vars);
        else gsap.to(el, { ...vars, duration: 0.95, ease: "power3.out", overwrite: "auto" });
      });
    },
    [active, n],
  );

  const first = useRef(true);
  useGSAP(
    () => {
      layout(first.current);
      first.current = false;
      gsap.fromTo("[data-swap]", { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "power3.out", stagger: 0.07 });
    },
    { scope: root, dependencies: [active, n] },
  );

  useEffect(() => {
    const onResize = () => layout(true);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [layout]);

  // Auto advance.
  useEffect(() => {
    if (n < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => {
      if (!paused.current) go(1);
    }, 3500);
    return () => clearInterval(t);
  }, [n, go]);

  // Entrance.
  useGSAP(
    () => {
      gsap.from(stage.current, {
        y: 70,
        opacity: 0,
        duration: 1.2,
        ease: "power3.out",
        scrollTrigger: { trigger: stage.current, start: "top 85%", once: true },
      });
    },
    { scope: root },
  );

  if (!n) return <section id="bridal" className="scroll-mt-24" />;

  const arrow = "grid h-11 w-11 place-items-center rounded-full border border-ink/15 bg-white/80 text-ink shadow-sm backdrop-blur transition hover:bg-pink hover:text-white focus-visible:ring-2 focus-visible:ring-pink focus-visible:outline-none";

  return (
    <section ref={root} id="bridal" className="scroll-mt-24 overflow-x-clip py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading copy={copy} align="center" />
      </div>

      <div
        role="region"
        aria-roledescription="carousel"
        aria-label={copy.title}
        tabIndex={0}
        className="relative mx-auto mt-6 max-w-7xl outline-none focus-visible:ring-2 focus-visible:ring-pink/50"
        onMouseEnter={() => (paused.current = true)}
        onMouseLeave={() => (paused.current = false)}
        onFocus={() => (paused.current = true)}
        onBlur={() => (paused.current = false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") go(-1);
          if (e.key === "ArrowRight") go(1);
        }}
        onPointerDown={(e) => (touchX.current = e.clientX)}
        onPointerUp={(e) => {
          if (touchX.current === null) return;
          const dx = e.clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        }}
      >
        <div ref={stage} className="relative h-[400px] touch-pan-y overflow-hidden sm:h-[540px]" style={{ perspective: "1400px", perspectiveOrigin: "50% 40%" }}>
          <div className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
            {products.map((pr, idx) => (
              <div
                key={pr.id}
                ref={(el) => {
                  cards.current[idx] = el;
                }}
                role="group"
                aria-roledescription="slide"
                aria-label={`${idx + 1} of ${n}: ${pr.name}`}
                onClick={() => idx !== active && setActive(idx)}
                className="arch absolute top-8 left-1/2 aspect-[3/4.2] w-[190px] cursor-pointer overflow-hidden bg-mist shadow-[0_30px_60px_-25px_rgba(58,10,34,0.5)] will-change-transform sm:w-[270px] lg:w-[300px]"
                style={{ opacity: 0 }}
              >
                <ProductMedia product={pr} sizes="(min-width:1024px) 300px, (min-width:640px) 270px, 190px" priority={idx < 3} />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                <span className="pointer-events-none absolute inset-x-0 bottom-5 text-center text-[10px] font-semibold tracking-[0.28em] text-white uppercase">
                  {pr.categories[0]?.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {n > 1 && (
          <>
            <button type="button" aria-label="Previous piece" onClick={() => go(-1)} className={`${arrow} absolute top-1/2 left-3 z-30 -translate-y-1/2 sm:left-8`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
            </button>
            <button type="button" aria-label="Next piece" onClick={() => go(1)} className={`${arrow} absolute top-1/2 right-3 z-30 -translate-y-1/2 sm:right-8`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M9 5l7 7-7 7" /></svg>
            </button>
          </>
        )}
      </div>

      <div className="mx-auto mt-4 flex max-w-xl flex-col items-center px-4 text-center" aria-live="polite">
        <h3 data-swap className="font-display text-3xl text-ink sm:text-4xl">
          {p.name}
        </h3>
        <p data-swap className="mt-2 text-base text-ink-soft">
          {p.onSale && <span className="mr-2 text-ink-soft/60 line-through">{formatPrice(p.regularPrice)}</span>}
          <span className="font-semibold text-ink">{formatPrice(p.price)}</span>
        </p>
        <button
          data-swap
          type="button"
          onClick={() =>
            add({ id: p.id, name: p.name, price: p.price, image: p.images[0]?.src, size: p.sizes[0] }, { message: `${p.name} added to your bag` })
          }
          className="mt-5 rounded-full bg-pink px-8 py-3 text-sm font-semibold tracking-wide text-white shadow-lg shadow-pink/25 transition-colors hover:bg-pink-deep focus-visible:ring-2 focus-visible:ring-pink focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Add to bag
        </button>
      </div>
    </section>
  );
}
