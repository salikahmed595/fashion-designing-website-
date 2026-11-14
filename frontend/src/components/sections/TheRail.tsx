"use client";
// The Rail: a wooden clothes rack. Garments hang front-facing on hangers; the selected one is centred and larger with
// a name/price card. Drag, arrows or keys move the rail; click or Enter opens a garment quick view modal (colour,
// size, add to bag, "See it on the model"). A Grid toggle shows the same pieces as product cards.
import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import type { Category, Product, SectionCopy } from "@/lib/types";
import { formatPrice, inCategory } from "@/lib/catalog";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { QuickView } from "./rail/QuickView";
import { HangerModal } from "./rail/HangerModal";
import { Face } from "./rail/Face";

gsap.registerPlugin(useGSAP);

const DESK = { slot: 180, gw: 156, gh: 224, stage: 365, big: 1.2 };
const MOB = { slot: 112, gw: 100, gh: 144, stage: 330, big: 1.4 };

const subscribe = (cb: () => void) => {
  const m = window.matchMedia("(min-width: 768px)");
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

export function TheRail({ copy, products, garmentTypes }: { copy: SectionCopy; products: Product[]; garmentTypes: Category[] }) {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef({ down: false, x: 0, acc: 0, moved: false });
  const last = useRef({ filter: "", sel: -1, w: 0, d: true });
  const switching = useRef(false);
  const desktop = useSyncExternalStore(subscribe, () => window.matchMedia("(min-width: 768px)").matches, () => true);
  const K = desktop ? DESK : MOB;

  const [mode, setMode] = useState<"rack" | "grid">("rack");
  const [filter, setFilter] = useState("all");
  const [selId, setSelId] = useState<number | null>(null);
  const [back, setBack] = useState(-1);
  const [modal, setModal] = useState<Product | null>(null);
  const [model, setModel] = useState<Product | null>(null);
  const [stageW, setStageW] = useState(1200);

  // Real hanger photos win once there are enough of them; otherwise every piece is drawn.
  const real = products.filter((p) => p.garment.front);
  const pool = real.length >= 4 ? real : products;
  const chips = garmentTypes.map((g) => ({ ...g, n: inCategory(pool, g.slug).length })).filter((g) => g.n > 0);
  const shown = filter === "all" ? pool : inCategory(pool, filter);
  const sel = shown.find((p) => p.id === selId) ?? shown[Math.floor((shown.length - 1) / 2)] ?? null;
  const selIndex = sel ? shown.indexOf(sel) : -1;
  const isBack = !!sel && back === sel.id;

  // Measure the stage (callback ref avoids an effect + setState on mount).
  const ro = useRef<ResizeObserver | null>(null);
  const setStage = useCallback((el: HTMLDivElement | null) => {
    ro.current?.disconnect();
    stage.current = el;
    if (!el) return;
    ro.current = new ResizeObserver(() => setStageW(el.clientWidth));
    ro.current.observe(el);
  }, []);

  // Lay the rack out: slide the track so the selection is centred, scale/fade the rest (no blur: cheap on old GPUs).
  useGSAP(
    () => {
      if (mode !== "rack") return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const slots = gsap.utils.toArray<HTMLElement>("[data-slot]");
      const L = last.current;
      const fresh = L.sel === -1 || L.filter !== filter;
      const animate = !reduce && !fresh && L.d === desktop;
      const selChanged = !fresh && L.sel !== selIndex;
      last.current = { filter, sel: selIndex, w: stageW, d: desktop };

      slots.forEach((slot, i) => {
        const on = i === selIndex;
        const dist = Math.abs(i - selIndex);
        const g = slot.querySelector<HTMLElement>("[data-g]");
        if (!g) return;
        gsap.set(g, { transformOrigin: "50% 0" });
        gsap.to(g, { scale: on ? K.big : Math.max(0.7, 0.88 - dist * 0.05), opacity: on ? 1 : Math.max(0.4, 0.8 - dist * 0.15), duration: animate ? 0.6 : 0, ease: "power3.out", overwrite: "auto" });
        if (on && selChanged && !reduce) gsap.fromTo(g, { rotationZ: 4 }, { rotationZ: 0, duration: 2, ease: "elastic.out(1, 0.3)" });
        slot.style.zIndex = on ? "10" : "1";
      });
      gsap.to(track.current, { x: stageW / 2 - (selIndex * K.slot + K.slot / 2), duration: animate ? 0.8 : 0, ease: "power3.out", overwrite: "auto" });
      if (fresh && !reduce) gsap.fromTo(slots, { y: -50, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, ease: "power3.out", stagger: 0.03, clearProps: "transform,visibility", overwrite: false });
    },
    { scope: root, dependencies: [filter, selIndex, desktop, stageW, mode] },
  );

  // Show back / front flip of the selected hanger (2D squash, cheap).
  useGSAP(
    () => {
      if (mode !== "rack") return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      gsap.utils.toArray<HTMLElement>("[data-flip]").forEach((el, i) => {
        gsap.to(el, { rotationY: i === selIndex && isBack ? 180 : 0, duration: i === selIndex && !reduce ? 0.8 : 0, ease: "power2.inOut", overwrite: "auto" });
      });
    },
    { scope: root, dependencies: [isBack, selIndex, filter, mode] },
  );

  const select = (id: number) => id !== sel?.id && setSelId(id);
  const step = (d: number) => {
    const i = Math.min(shown.length - 1, Math.max(0, selIndex + d));
    if (shown[i]) select(shown[i].id);
  };

  const changeFilter = (slug: string) => {
    if (slug === filter || switching.current) return;
    const apply = () => {
      setFilter(slug);
      setSelId(null);
      switching.current = false;
    };
    if (mode !== "rack" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return apply();
    switching.current = true;
    gsap.to("[data-slot]", { opacity: 0, y: 40, duration: 0.25, ease: "power2.in", stagger: 0.015, onComplete: apply });
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      step(e.key === "ArrowRight" ? 1 : -1);
    } else if (e.key === "Enter" && sel && e.target === e.currentTarget) {
      e.preventDefault();
      setModal(sel);
    }
  };

  const pd = {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      drag.current = { down: true, x: e.clientX, acc: 0, moved: false };
    },
    onPointerMove: (e: React.PointerEvent) => {
      const d = drag.current;
      if (!d.down) return;
      const dx = e.clientX - d.x;
      if (Math.abs(dx) > 8) d.moved = true;
      const unit = K.slot * 0.7;
      const n = Math.trunc((dx - d.acc) / unit);
      if (n !== 0) {
        d.acc += n * unit;
        step(-n);
      }
    },
    onPointerUp: () => {
      drag.current.down = false;
      setTimeout(() => (drag.current.moved = false), 0);
    },
    onPointerLeave: () => {
      drag.current.down = false;
    },
  };

  const swing = (el: HTMLElement, on: boolean) => {
    if (on || gsap.isTweening(el) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.fromTo(el, { rotationZ: 5 }, { rotationZ: 0, duration: 1.5, ease: "elastic.out(1, 0.3)" });
  };

  const round =
    "absolute bottom-3 z-20 grid h-11 w-11 place-items-center rounded-full bg-white text-xl shadow-md transition hover:bg-pink hover:text-white focus-visible:ring-2 focus-visible:ring-pink focus-visible:outline-none disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-ink";

  return (
    <section ref={root} id="rail" className="relative scroll-mt-24 overflow-hidden bg-gradient-to-b from-paper via-white to-paper py-8 sm:py-9">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading copy={copy} align="left" className="max-w-xl" />
          <div className="flex min-w-0 items-center gap-3">
            <div className="no-scrollbar flex min-w-0 gap-2 overflow-x-auto p-1" role="group" aria-label="Filter by garment">
              {[{ slug: "all", name: "All", n: pool.length }, ...chips.map((c) => ({ slug: c.slug, name: c.name, n: c.n }))].map((c) => {
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
            <div role="group" aria-label="Layout" className="flex shrink-0 rounded-full border border-ink/15 bg-white/70 p-0.5">
              {(["rack", "grid"] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)} aria-pressed={mode === m} className={`rounded-full px-3.5 py-1.5 text-xs font-bold tracking-wider uppercase transition focus-visible:ring-2 focus-visible:ring-pink focus-visible:outline-none ${mode === m ? "bg-ink text-white" : "text-ink-soft hover:text-ink"}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {mode === "rack" ? (
        <>
          <div
            ref={setStage}
            tabIndex={0}
            role="group"
            aria-roledescription="clothing rack"
            aria-label="Clothing rack. Left and right arrow keys choose a garment, Enter opens it"
            onKeyDown={onKey}
            {...pd}
            className="relative mt-5 w-full cursor-grab touch-pan-y overflow-hidden bg-gradient-to-b from-white to-[#f4f2f0] select-none focus-visible:ring-2 focus-visible:ring-pink focus-visible:ring-inset focus-visible:outline-none active:cursor-grabbing"
            style={{ height: K.stage }}
          >
            {/* wooden rail */}
            <div className="pointer-events-none absolute inset-x-0 top-[24px] z-0 h-[10px] bg-gradient-to-b from-[#d9ae78] via-[#b98150] to-[#7a4c29] shadow-[0_5px_8px_rgba(58,28,8,0.25)]" />
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[12%] bg-gradient-to-r from-white to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-[12%] bg-gradient-to-l from-white to-transparent" />

            <div ref={track} className="absolute top-0 left-0 flex h-full">
              {shown.map((p) => {
                const on = sel?.id === p.id;
                return (
                  <div key={p.id} data-slot className="relative h-full shrink-0" style={{ width: K.slot }}>
                    <button
                      data-g
                      onClick={() => !drag.current.moved && (on ? setModal(p) : select(p.id))}
                      onPointerEnter={(e) => swing(e.currentTarget, on)}
                      aria-label={on ? `Open ${p.name}` : `Select ${p.name}`}
                      aria-current={on}
                      tabIndex={-1}
                      className="absolute top-[12px] block focus-visible:outline-none"
                      style={{ left: (K.slot - K.gw) / 2, width: K.gw, height: K.gh, perspective: 1100 }}
                    >
                      <div data-flip className="relative h-full w-full" style={{ transformStyle: "preserve-3d" }}>
                        <div className="absolute inset-0" style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}>
                          <Face p={p} view="front" sizes="200px" />
                        </div>
                        {on && (
                          <div className="absolute inset-0" style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}>
                            <Face p={p} view="back" sizes="200px" />
                          </div>
                        )}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>

            {sel && (
              <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-xl bg-white px-5 py-2.5 text-center shadow-[0_10px_24px_-10px_rgba(58,10,34,0.35)]">
                <p className="max-w-[240px] truncate font-display text-lg leading-tight font-semibold text-ink">{sel.name}</p>
                <p className="text-sm font-semibold text-pink">{formatPrice(sel.price)}</p>
              </div>
            )}
            <button onClick={() => step(-1)} disabled={selIndex <= 0} aria-label="Previous garment" className={`${round} left-4`}>‹</button>
            <button onClick={() => step(1)} disabled={selIndex >= shown.length - 1} aria-label="Next garment" className={`${round} right-4`}>›</button>
            {shown.length === 0 && <p className="absolute inset-0 grid place-items-center text-sm text-ink-soft">Nothing on this rail yet.</p>}
          </div>

          {sel && (
            <div className="mx-auto mt-4 max-w-7xl px-4 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-ink-soft" aria-live="polite">
                  <span className="font-semibold text-ink">{sel.name}</span> · {formatPrice(sel.price)} · {selIndex + 1} of {shown.length}
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setBack(isBack ? -1 : sel.id)} aria-pressed={isBack} className="rounded-full border border-ink/20 px-5 py-2 text-sm font-semibold text-ink transition hover:border-pink hover:text-pink focus-visible:ring-2 focus-visible:ring-pink focus-visible:outline-none">
                    {isBack ? "Show front" : "Show back"}
                  </button>
                  <button onClick={() => setModal(sel)} className="rounded-full bg-pink px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-pink-deep focus-visible:ring-2 focus-visible:ring-pink focus-visible:ring-offset-2 focus-visible:outline-none">
                    Quick view
                  </button>
                </div>
              </div>
              <p className="mt-2 text-xs text-ink-soft/80">Hover a hanger, drag or swipe the rail, or use ← → keys. Tap or press Enter to open.</p>
            </div>
          )}
        </>
      ) : (
        <ul className="mx-auto mt-6 grid max-w-7xl grid-cols-2 gap-3 px-4 sm:grid-cols-3 sm:gap-5 sm:px-6 lg:grid-cols-4">
          {shown.map((p) => (
            <li key={p.id}>
              <button onClick={() => setModal(p)} aria-label={`Open ${p.name}`} className="group block w-full rounded-2xl border border-ink/10 bg-white p-3 text-left transition hover:-translate-y-1 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-pink focus-visible:outline-none">
                <div className="relative h-[220px] rounded-xl bg-gradient-to-b from-[#f2f0ee] to-white sm:h-[250px]">
                  <Face p={p} view="front" sizes="260px" />
                </div>
                <p className="mt-3 truncate font-display text-lg font-semibold text-ink">{p.name}</p>
                <p className="text-sm font-semibold text-pink">{formatPrice(p.price)}</p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {modal && <HangerModal key={modal.id} product={modal} paused={!!model} onModel={() => setModel(modal)} onClose={() => setModal(null)} />}
      {model && <QuickView key={`m${model.id}`} product={model} garmentTypes={garmentTypes} onClose={() => setModel(null)} />}
    </section>
  );
}
