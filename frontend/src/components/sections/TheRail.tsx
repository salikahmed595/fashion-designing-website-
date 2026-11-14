"use client";
// The Rail: a minimal 3D product viewer. Garments (real hanger photos, or drawn in their real fabric) hang from a
// thin rail, edge-on. The selected one slides to the centre and swings round to face front; colour options hang
// beside it as swing tags, FRONT | BACK flips it in 3D. "See details" opens the lookbook QuickView.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import type { Category, Product, SectionCopy } from "@/lib/types";
import { formatPrice, inCategory, swatchOf } from "@/lib/catalog";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useCart } from "@/components/cart/CartProvider";
import { QuickView } from "./rail/QuickView";
import { GarmentArt } from "./rail/GarmentArt";
import { SwingTags, type Tag } from "./rail/SwingTags";

gsap.registerPlugin(useGSAP);

const DESK = { gw: 216, gh: 310, sliver: 42, tags: 150, stage: 360 };
const MOB = { gw: 184, gh: 264, sliver: 28, tags: 0, stage: 330 };

const subscribe = (cb: () => void) => {
  const m = window.matchMedia("(min-width: 768px)");
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

const tagsOf = (p: Product): Tag[] =>
  p.colorways.length ? p.colorways.map((c) => ({ name: c.name, hex: c.hex })) : swatchOf(p).map((hex, i) => ({ name: `Swatch ${i + 1}`, hex }));

/** One face (front or back) of a garment: the client's hanger photo if there is one, else the drawn garment. */
function Face({ p, view, tag, tinted }: { p: Product; view: "front" | "back"; tag: Tag; tinted: boolean }) {
  const shot = view === "front" ? p.garment.front : p.garment.back;
  if (shot) return <Image src={shot.src} alt="" fill sizes="260px" draggable={false} className="object-contain object-top" />;
  return <GarmentArt kind={p.garment.kind} view={view} fabric={p.garment.fabric?.src ?? null} base={tag.hex} tint={tinted ? tag.hex : null} className="h-full w-full" />;
}

export function TheRail({ copy, products, garmentTypes }: { copy: SectionCopy; products: Product[]; garmentTypes: Category[] }) {
  const { add } = useCart();
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef({ down: false, x: 0, acc: 0, moved: false });
  const lastLayout = useRef({ filter: "", sel: -1 });
  const switching = useRef(false);
  const desktop = useSyncExternalStore(subscribe, () => window.matchMedia("(min-width: 768px)").matches, () => true);
  const K = desktop ? DESK : MOB;

  const [filter, setFilter] = useState("all");
  const [selId, setSelId] = useState<number | null>(products[0]?.id ?? null);
  const [colour, setColour] = useState({ id: -1, i: 0 });
  const [back, setBack] = useState(-1); // id of the product currently showing its back
  const [sizePick, setSizePick] = useState({ id: -1, size: "" });
  const [needSize, setNeedSize] = useState(false);
  const [added, setAdded] = useState(false);
  const [quick, setQuick] = useState<Product | null>(null);
  const [stageW, setStageW] = useState(1200);

  const chips = garmentTypes.map((g) => ({ ...g, n: inCategory(products, g.slug).length })).filter((g) => g.n > 0);
  const shown = filter === "all" ? products : inCategory(products, filter);
  const sel = shown.find((p) => p.id === selId) ?? shown[0] ?? null;
  const selIndex = sel ? shown.indexOf(sel) : -1;
  const tags = sel ? tagsOf(sel) : [];
  const ci = sel && colour.id === sel.id ? Math.min(colour.i, tags.length - 1) : 0;
  const isBack = !!sel && back === sel.id;
  const size = sel && sizePick.id === sel.id ? sizePick.size : "";

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setStageW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Position everything: slot widths, garment rotation/scale/depth, and slide the track so the selection is centred.
  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const slots = gsap.utils.toArray<HTMLElement>("[data-slot]");
      const first = lastLayout.current.sel === -1;
      const filterChanged = lastLayout.current.filter !== filter;
      const selChanged = !first && !filterChanged && lastLayout.current.sel !== selIndex;
      const animate = !reduce && !first && !filterChanged;
      lastLayout.current = { filter, sel: selIndex };

      slots.forEach((slot, i) => {
        const on = i === selIndex;
        const dist = Math.abs(i - selIndex);
        const g = slot.querySelector<HTMLElement>("[data-g]");
        if (!g) return;
        gsap.set(g, { transformPerspective: 1300, transformOrigin: "50% 0" });
        gsap.to(slot, { width: on ? K.gw + K.tags : K.sliver, duration: animate ? 0.9 : 0, ease: "power3.out", overwrite: "auto" });
        gsap.to(g, {
          x: on ? K.gw / 2 - K.sliver / 2 : 0,
          scale: on ? 1 : 0.86,
          z: on ? 80 : -Math.min(dist, 6) * 16,
          rotationY: on ? 0 : 80,
          opacity: on ? 1 : Math.max(0.5, 1 - dist * 0.08),
          filter: on ? "blur(0px)" : `blur(${Math.min(2.2, 0.5 + dist * 0.35)}px)`,
          duration: animate ? (on ? 1.7 : 0.9) : 0,
          ease: on ? "elastic.out(1, 0.55)" : "power3.inOut",
          overwrite: "auto",
        });
        if (on && selChanged && !reduce) gsap.fromTo(g, { rotationZ: 5 }, { rotationZ: 0, duration: 2.6, ease: "elastic.out(1, 0.25)" });
        slot.style.zIndex = on ? "10" : "1";
      });
      gsap.to(track.current, { x: stageW / 2 - (selIndex * K.sliver + K.gw / 2), duration: animate ? 1 : 0, ease: "power3.out", overwrite: "auto" });

      if ((first || filterChanged) && !reduce) {
        gsap.fromTo(slots, { opacity: 0, y: -70 }, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.035, clearProps: "opacity,transform" });
      }
    },
    { scope: root, dependencies: [filter, selIndex, desktop, stageW] },
  );

  // 3D flip between FRONT and BACK.
  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      gsap.utils.toArray<HTMLElement>("[data-flip]").forEach((el, i) => {
        const to = i === selIndex && isBack ? 180 : 0;
        gsap.to(el, { rotationY: to, duration: i === selIndex && !reduce ? 1 : 0, ease: "power2.inOut", overwrite: "auto" });
      });
    },
    { scope: root, dependencies: [isBack, selIndex, filter] },
  );

  const select = (id: number) => {
    if (id === sel?.id) return;
    setSelId(id);
    setNeedSize(false);
    setAdded(false);
  };
  const step = (d: number) => {
    const i = Math.min(shown.length - 1, Math.max(0, selIndex + d));
    if (shown[i]) select(shown[i].id);
  };

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
    gsap.to("[data-slot]", { opacity: 0, y: 60, duration: 0.28, ease: "power2.in", stagger: 0.015, onComplete: apply });
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      step(e.key === "ArrowRight" ? 1 : -1);
    } else if (e.key === "Enter" && sel && e.target === e.currentTarget) {
      e.preventDefault();
      setQuick(sel);
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
      const unit = K.sliver * 1.4;
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

  const hover = (el: HTMLElement | null, on: boolean, selected: boolean) => {
    if (!el || selected) return;
    gsap.to(el, { rotationY: on ? 66 : 80, x: on ? -4 : 0, duration: 0.35, ease: "power2.out", overwrite: "auto" });
  };

  const addToBag = () => {
    if (!sel) return;
    if (sel.sizes.length && !size) return setNeedSize(true);
    const t = tags[ci];
    add({
      id: sel.id,
      name: sel.colorways.length && t ? `${sel.name}, ${t.name}` : sel.name,
      price: sel.price,
      image: sel.garment.front?.src ?? sel.images[0]?.src,
      size: size || undefined,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  };

  const pill = (on: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-xs font-semibold tracking-wide transition focus-visible:ring-2 focus-visible:ring-pink focus-visible:outline-none ${
      on ? "border-ink bg-ink text-white" : "border-ink/20 bg-white/70 text-ink hover:border-ink"
    }`;

  return (
    <section ref={root} id="rail" className="relative scroll-mt-24 overflow-hidden bg-gradient-to-b from-paper via-white to-paper py-10 sm:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
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
      </div>

      {/* Stage */}
      <div
        ref={stage}
        tabIndex={0}
        role="group"
        aria-roledescription="3D clothing rail"
        aria-label="Clothing rail. Left and right arrow keys choose a garment, Enter opens details"
        onKeyDown={onKey}
        {...pd}
        className="relative mt-4 w-full cursor-grab touch-pan-y overflow-hidden bg-gradient-to-b from-white via-[#f7f5f3] to-[#efece9] select-none focus-visible:ring-2 focus-visible:ring-pink focus-visible:ring-inset focus-visible:outline-none active:cursor-grabbing"
        style={{ height: K.stage }}
      >
        {/* rail */}
        <div className="pointer-events-none absolute inset-x-0 top-[22px] z-0 h-[5px] bg-gradient-to-b from-white via-[#b9b5b6] to-[#7d787b] shadow-[0_3px_5px_rgba(0,0,0,0.18)]" />

        <div className="absolute inset-0" style={{ maskImage: "linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent)" }}>
          <div ref={track} className="absolute top-0 left-0 flex h-full">
            {shown.map((p, i) => {
              const on = sel?.id === p.id;
              const t = tagsOf(p);
              const tag = t[on ? ci : 0];
              const tinted = on && ci > 0;
              return (
                <div key={p.id} data-slot className="relative h-full shrink-0" style={{ width: i === selIndex ? K.gw + K.tags : K.sliver }}>
                  <button
                    data-g
                    onClick={() => !drag.current.moved && select(p.id)}
                    onPointerEnter={(e) => hover(e.currentTarget, true, on)}
                    onPointerLeave={(e) => hover(e.currentTarget, false, on)}
                    onFocus={(e) => hover(e.currentTarget, true, on)}
                    onBlur={(e) => hover(e.currentTarget, false, on)}
                    aria-label={on ? p.name : `Select ${p.name}`}
                    aria-current={on}
                    tabIndex={-1}
                    className="absolute block focus-visible:outline-none"
                    style={{ top: 12, left: K.sliver / 2 - K.gw / 2, width: K.gw, height: K.gh, transformStyle: "preserve-3d" }}
                  >
                    <div data-flip className="relative h-full w-full" style={{ transformStyle: "preserve-3d" }}>
                      <div
                        className="absolute inset-0"
                        style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", filter: on ? "drop-shadow(0 18px 14px rgba(40,20,30,0.28))" : "drop-shadow(0 8px 8px rgba(40,20,30,0.22))" }}
                      >
                        <Face p={p} view="front" tag={tag} tinted={tinted} />
                      </div>
                      {on && (
                        <div
                          className="absolute inset-0"
                          style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", filter: "drop-shadow(0 18px 14px rgba(40,20,30,0.28))" }}
                        >
                          <Face p={p} view="back" tag={tag} tinted={tinted} />
                        </div>
                      )}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* swing tags (desktop): hang from the rail to the right of the selected garment */}
        {sel && desktop && (
          <div className="absolute z-20" style={{ top: 22, left: `calc(50% + ${K.gw / 2 + 16}px)` }}>
            <SwingTags key={sel.id} tags={tags} active={ci} onPick={(i) => setColour({ id: sel.id, i })} />
          </div>
        )}
        {shown.length === 0 && <p className="absolute inset-0 grid place-items-center text-sm text-ink-soft">Nothing on this rail yet.</p>}
      </div>

      {/* Info */}
      {sel && (
        <div className="mx-auto mt-5 flex max-w-3xl flex-col items-center gap-3 px-4 text-center" aria-live="polite">
          <div>
            <p className="font-display text-xl font-semibold tracking-[0.2em] text-ink uppercase sm:text-2xl">{sel.name}</p>
            <p className="mt-0.5 text-sm text-ink-soft">
              <span className="font-semibold text-pink">{formatPrice(sel.price)}</span>
              {sel.onSale && <span className="ml-2 text-xs line-through opacity-70">{formatPrice(sel.regularPrice)}</span>}
              {sel.colorways.length > 0 && <span className="ml-2 text-xs">· {tags[ci]?.name}</span>}
            </p>
          </div>

          {!desktop && <SwingTagsPills tags={tags} active={ci} onPick={(i) => setColour({ id: sel.id, i })} />}

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3">
            <div role="group" aria-label="View" className="flex rounded-full border border-ink/20 bg-white/70 p-0.5">
              {(["front", "back"] as const).map((v) => {
                const on = (v === "back") === isBack;
                return (
                  <button
                    key={v}
                    onClick={() => setBack(v === "back" ? sel.id : -1)}
                    aria-pressed={on}
                    className={`rounded-full px-4 py-1.5 text-[11px] font-bold tracking-[0.18em] uppercase transition focus-visible:ring-2 focus-visible:ring-pink focus-visible:outline-none ${on ? "bg-ink text-white" : "text-ink-soft hover:text-ink"}`}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
            {sel.sizes.length > 0 && (
              <div role="group" aria-label="Size" className="flex flex-wrap justify-center gap-1.5">
                {sel.sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setSizePick({ id: sel.id, size: s });
                      setNeedSize(false);
                    }}
                    aria-pressed={size === s}
                    className={pill(size === s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          {needSize && (
            <p role="alert" className="-mt-1 text-xs font-medium text-pink-deep">
              Please choose a size first.
            </p>
          )}
          <div className="flex items-center gap-5">
            <button
              onClick={addToBag}
              className="rounded-full bg-pink px-7 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-pink-deep focus-visible:ring-2 focus-visible:ring-pink focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {added ? "Added to bag ✓" : "Add to bag"}
            </button>
            <button
              onClick={() => setQuick(sel)}
              className="text-[11px] font-bold tracking-[0.18em] text-ink uppercase underline decoration-ink/30 underline-offset-[6px] transition hover:text-pink hover:decoration-pink focus-visible:ring-2 focus-visible:ring-pink focus-visible:outline-none"
            >
              See details ↗
            </button>
          </div>
        </div>
      )}

      {quick && <QuickView key={quick.id} product={quick} garmentTypes={garmentTypes} onClose={() => setQuick(null)} />}
    </section>
  );
}

/** Mobile colour picker: small tag-like chips under the garment. */
function SwingTagsPills({ tags, active, onPick }: { tags: Tag[]; active: number; onPick: (i: number) => void }) {
  return (
    <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Colour">
      {tags.map((t, i) => (
        <button
          key={`${t.name}${i}`}
          onClick={() => onPick(i)}
          aria-pressed={active === i}
          className={`flex items-center gap-2 rounded-md border px-2.5 py-1 text-[10px] font-bold tracking-[0.16em] uppercase transition focus-visible:ring-2 focus-visible:ring-pink focus-visible:outline-none ${
            active === i ? "border-ink bg-white shadow-md" : "border-ink/15 bg-white/60"
          }`}
        >
          <span className="h-3.5 w-3.5 rounded-sm border border-black/15" style={{ background: t.hex }} />
          {t.name}
        </button>
      ))}
    </div>
  );
}
