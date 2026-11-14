"use client";
// The Rail: filter chips above a boutique wardrobe. Garments hang sideways (rotateY ~78deg) from a brass rail as
// slim slivers; the selected one slides forward and turns to face front while its neighbours part. Quick view opens
// a front/back flip modal. Row scrolls by drag or arrow buttons; arrow keys move the selection, Enter opens it.
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import type { Category, Product, SectionCopy } from "@/lib/types";
import { formatPrice, inCategory, swatchOf } from "@/lib/catalog";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { QuickView } from "./rail/QuickView";

gsap.registerPlugin(useGSAP);

const SLIVER = 40; // slot width of a hanging garment (px)
const FACE = 250; // slot width of the selected garment (px)
const W = 190; // garment width
const H = 270; // garment height

function Hook() {
  return (
    <svg viewBox="0 0 40 44" className="mx-auto block h-11 w-10" aria-hidden="true">
      <path d="M20 40c-8-3-9-9-3-13 3-2 5-5 3-8-1-3 1-6 4-6" fill="none" stroke="#b08a4c" strokeWidth="2.4" strokeLinecap="round" transform="translate(0 -2)" />
      <path d="M5 42c10-9 20-9 30 0" fill="none" stroke="#8a5f35" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function TheRail({ copy, products, garmentTypes }: { copy: SectionCopy; products: Product[]; garmentTypes: Category[] }) {
  const root = useRef<HTMLElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const drag = useRef({ down: false, x: 0, left: 0, moved: false });
  const [filter, setFilter] = useState("all");
  const [selId, setSelId] = useState<number | null>(products[0]?.id ?? null);
  const [quick, setQuick] = useState<Product | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const switching = useRef(false);

  const chips = garmentTypes.map((g) => ({ ...g, n: inCategory(products, g.slug).length })).filter((g) => g.n > 0);
  const shown = filter === "all" ? products : inCategory(products, filter);
  const sel = shown.find((p) => p.id === selId) ?? shown[0] ?? null;
  const selIndex = sel ? shown.indexOf(sel) : -1;

  // Garments drop in on first view and after every filter change.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo("[data-slot]", { opacity: 0, y: -50 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.04, clearProps: "transform,opacity" });
      });
      scroller.current?.scrollTo({ left: 0 });
    },
    { scope: root, dependencies: [filter] },
  );

  const pick = (id: number) => setSelId(id);

  const changeFilter = (slug: string) => {
    if (slug === filter || switching.current) return;
    const next = slug === "all" ? products : inCategory(products, slug);
    const apply = () => {
      setFilter(slug);
      setSelId(next[0]?.id ?? null);
      switching.current = false;
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return apply();
    switching.current = true;
    gsap.to("[data-slot]", { opacity: 0, y: 50, duration: 0.28, ease: "power2.in", stagger: 0.02, onComplete: apply });
  };

  // Keep the selected garment centred in the scrolling row.
  useEffect(() => {
    const sc = scroller.current;
    const el = sc?.querySelector<HTMLElement>(`[data-id="${sel?.id}"]`);
    if (!sc || !el) return;
    const target = el.offsetLeft + FACE / 2 - sc.clientWidth / 2;
    sc.scrollTo({ left: Math.max(0, target), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [sel?.id]);

  const by = (dx: number) => scroller.current?.scrollBy({ left: dx, behavior: "smooth" });

  const onKey = (e: React.KeyboardEvent) => {
    if (!shown.length || selIndex < 0) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const i = Math.min(shown.length - 1, Math.max(0, selIndex + (e.key === "ArrowRight" ? 1 : -1)));
      pick(shown[i].id);
    } else if (e.key === "Enter" && sel && e.target === e.currentTarget) {
      e.preventDefault();
      setQuick(sel);
    }
  };

  const pd = {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      drag.current = { down: true, x: e.clientX, left: scroller.current?.scrollLeft ?? 0, moved: false };
    },
    onPointerMove: (e: React.PointerEvent) => {
      const d = drag.current;
      if (!d.down || !scroller.current) return;
      const dx = e.clientX - d.x;
      if (Math.abs(dx) > 6) d.moved = true;
      if (d.moved) scroller.current.scrollLeft = d.left - dx;
    },
    onPointerUp: () => {
      drag.current.down = false;
    },
    onPointerLeave: () => {
      drag.current.down = false;
    },
  };

  const arrowBtn =
    "absolute top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-xl shadow-lg transition hover:bg-pink hover:text-white focus-visible:ring-2 focus-visible:ring-pink focus-visible:outline-none md:grid";

  return (
    <section ref={root} id="rail" className="relative scroll-mt-24 overflow-hidden bg-gradient-to-b from-paper via-mist/60 to-paper px-4 py-14 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-7xl">
        <SectionHeading copy={copy} align="center" />

        <div className="no-scrollbar mx-auto mt-6 flex w-max max-w-full gap-2 overflow-x-auto p-1" role="group" aria-label="Filter by garment">
          {[{ slug: "all", name: "All", n: products.length }, ...chips.map((c) => ({ slug: c.slug, name: c.name, n: c.n }))].map((c) => {
            const on = filter === c.slug;
            return (
              <button
                key={c.slug}
                onClick={() => changeFilter(c.slug)}
                aria-pressed={on}
                className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-pink focus-visible:outline-none ${
                  on ? "border-pink bg-pink text-white shadow-[0_8px_22px_-8px_rgba(227,24,125,0.7)]" : "border-ink/15 bg-white/70 text-ink hover:border-pink"
                }`}
              >
                {c.name}
                <span className={`rounded-full px-1.5 text-[10px] leading-4 font-bold ${on ? "bg-white/25 text-white" : "bg-mist text-ink-soft"}`}>{c.n}</span>
              </button>
            );
          })}
        </div>

        {/* The wardrobe */}
        <div className="relative mx-auto mt-6 max-w-5xl" style={{ perspective: "1600px" }}>
          <div
            className="rounded-[22px] p-3 shadow-[0_40px_70px_-30px_rgba(58,10,34,0.5)] sm:p-4"
            style={{ background: "linear-gradient(135deg,#8a5a34,#b98150 30%,#7a4c29 60%,#a8703f)" }}
          >
            <div
              className="relative overflow-hidden rounded-[12px]"
              style={{
                background:
                  "radial-gradient(ellipse 60% 70% at 50% 18%, rgba(255,226,170,0.75), rgba(255,226,170,0) 70%), linear-gradient(180deg,#f3e2c4,#e2c79b 70%,#c9a572)",
                boxShadow: "inset 0 16px 24px -10px rgba(58,28,8,0.55), inset 14px 0 22px -12px rgba(58,28,8,0.5), inset -14px 0 22px -12px rgba(58,28,8,0.5), inset 0 -10px 18px -10px rgba(58,28,8,0.45)",
              }}
            >
              {/* top shelf */}
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-4 bg-gradient-to-b from-[#7a4c29] to-[#a8703f]/0" />
              <button onClick={() => by(-320)} aria-label="Scroll wardrobe left" className={`${arrowBtn} left-2`}>
                ‹
              </button>
              <button onClick={() => by(320)} aria-label="Scroll wardrobe right" className={`${arrowBtn} right-2`}>
                ›
              </button>

              <div
                ref={scroller}
                tabIndex={0}
                role="group"
                aria-roledescription="wardrobe"
                aria-label="Wardrobe. Use left and right arrow keys to choose a garment, Enter for quick view"
                onKeyDown={onKey}
                {...pd}
                className="no-scrollbar relative cursor-grab overflow-x-auto overflow-y-hidden focus-visible:ring-2 focus-visible:ring-pink focus-visible:ring-inset focus-visible:outline-none active:cursor-grabbing"
              >
                <div className="relative flex h-[min(46vh,390px)] min-h-[340px] w-max min-w-full items-start justify-center px-10 pt-4 md:px-16">
                  {/* brass rail */}
                  <div className="pointer-events-none absolute inset-x-0 top-[30px] z-0 h-[9px] rounded-full bg-gradient-to-b from-[#fff3c4] via-[#c9a24a] to-[#7d5f1d] shadow-[0_4px_6px_rgba(58,28,8,0.4)]" />
                  {shown.map((p, i) => {
                    const on = sel?.id === p.id;
                    const hov = hover === p.id && !on;
                    const c = swatchOf(p);
                    const img = p.colorways[0]?.images[0] ?? p.images[0];
                    const rot = on ? 0 : hov ? 66 : 78;
                    return (
                      <div
                        key={p.id}
                        data-slot
                        data-id={p.id}
                        className="relative shrink-0 transition-[width] duration-700 ease-[cubic-bezier(.3,.8,.2,1)] motion-reduce:transition-none"
                        style={{ width: on ? FACE : SLIVER, zIndex: on ? 5 : 1 }}
                      >
                        <button
                          onClick={() => {
                            if (drag.current.moved) return;
                            if (on) setQuick(p);
                            else pick(p.id);
                          }}
                          onPointerEnter={() => setHover(p.id)}
                          onPointerLeave={() => setHover(null)}
                          onFocus={() => setHover(p.id)}
                          onBlur={() => setHover(null)}
                          aria-label={on ? `${p.name}, open quick view` : `Select ${p.name}`}
                          aria-current={on}
                          tabIndex={on ? 0 : -1}
                          className="absolute top-0 left-1/2 block -translate-x-1/2 focus-visible:outline-none"
                          style={{ width: W, perspective: "1000px" }}
                        >
                          <div
                            style={{
                              transform: `translateZ(${on ? 60 : 0}px) rotateY(${rot}deg) scale(${on ? 1.06 : 1})`,
                              transformOrigin: "50% 0",
                              transition: "transform 0.8s cubic-bezier(.3,.8,.2,1)",
                              transformStyle: "preserve-3d",
                            }}
                            className="motion-reduce:!transition-none"
                          >
                            <Hook />
                            <div
                              className="relative -mt-1 overflow-hidden rounded-[10px] shadow-[0_18px_20px_-10px_rgba(58,28,8,0.55)] ring-1 ring-black/10"
                              style={{
                                height: H,
                                background: `linear-gradient(165deg, ${c[0]}, ${c[1]} 60%, ${c[2]})`,
                                filter: on ? "none" : `brightness(${hov ? 1 : 0.88})`,
                                transition: "filter .4s",
                              }}
                            >
                              {img && (
                                <Image
                                  src={img.src}
                                  alt={on ? img.alt || p.name : ""}
                                  fill
                                  draggable={false}
                                  sizes="190px"
                                  priority={i < 3}
                                  className="object-cover object-[50%_8%]"
                                />
                              )}
                            </div>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                  {shown.length === 0 && <p className="self-center py-20 text-sm text-ink-soft">Nothing in this wardrobe yet.</p>}
                </div>
              </div>
            </div>
            {/* plinth */}
            <div className="mx-auto mt-2 h-2 w-[96%] rounded-full bg-gradient-to-b from-[#6b4020] to-[#4a2a12]/80" />
          </div>
        </div>

        {/* Selected garment info */}
        <div className="mt-5 flex min-h-[72px] flex-col items-center justify-center gap-2 text-center sm:flex-row sm:gap-6" aria-live="polite">
          {sel && (
            <>
              <div>
                <p className="font-display text-2xl leading-tight font-semibold text-ink">{sel.name}</p>
                <p className="text-sm text-ink-soft">
                  <span className="font-semibold text-pink">{formatPrice(sel.price)}</span>
                  {sel.onSale && <span className="ml-2 text-xs line-through opacity-70">{formatPrice(sel.regularPrice)}</span>}
                </p>
              </div>
              <button
                onClick={() => setQuick(sel)}
                className="rounded-full bg-pink px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-pink-deep focus-visible:ring-2 focus-visible:ring-pink focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                Quick view
              </button>
            </>
          )}
        </div>
      </div>

      {quick && <QuickView key={quick.id} product={quick} garmentTypes={garmentTypes} onClose={() => setQuick(null)} />}
    </section>
  );
}
