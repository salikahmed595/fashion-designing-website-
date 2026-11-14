"use client";
// "Weave": pick any three fabrics and they are woven together. Three R3F silk
// ribbons run behind the heading; each chosen swatch fills the next slot (I, II,
// III) and that thread widens into a patterned silk band. With three chosen the
// bands braid into a helix and the trio can be added to the bag at a discount.
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useCart } from "@/components/cart/CartProvider";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { WebGLBoundary } from "@/components/three/WebGLBoundary";
import type { RibbonSpec } from "@/components/three/WeaveRibbons";
import { formatPrice, swatchOf } from "@/lib/catalog";
import type { Product, SectionCopy } from "@/lib/types";

const WeaveRibbons = dynamic(() => import("@/components/three/WeaveRibbons"), { ssr: false });

const NUMERALS = ["I", "II", "III"];

/** Round swatch: a conic gradient of the product's colours. */
const swatchBg = (p: Product) => {
  const c = swatchOf(p);
  const seg = 100 / c.length;
  return `conic-gradient(from 210deg, ${c.map((x, i) => `${x} ${i * seg}% ${(i + 1) * seg}%`).join(", ")})`;
};

export function Weave({
  copy,
  products,
  discountPercent,
}: {
  copy: SectionCopy;
  products: Product[];
  discountPercent: number;
}) {
  const { add } = useCart();
  const [slots, setSlots] = useState<(Product | null)[]>([null, null, null]);
  const [last, setLast] = useState<Product | null>(null);

  const chosen = slots.filter((p): p is Product => !!p);
  const full = chosen.length === 3;
  const pct = Math.max(0, Math.min(90, discountPercent || 0));
  const discounted = (p: Product) => Math.round(p.price * (1 - pct / 100));
  const regular = chosen.reduce((n, p) => n + p.price, 0);
  const total = chosen.reduce((n, p) => n + discounted(p), 0);
  const savings = regular - total;

  const specs = useMemo<RibbonSpec[]>(
    () => slots.map((p) => (p ? { colors: swatchOf(p), pattern: p.id % 3 } : null)),
    [slots],
  );

  const toggle = (p: Product) => {
    const at = slots.findIndex((x) => x?.id === p.id);
    if (at >= 0) return removeAt(at);
    const free = slots.indexOf(null);
    if (free < 0) return;
    setSlots((s) => s.map((x, i) => (i === free ? p : x)));
    setLast(p);
  };
  const removeAt = (i: number) => {
    setSlots((s) => s.map((x, j) => (j === i ? null : x)));
    setLast(null);
  };

  const weave = () => {
    if (!full) return;
    add(
      chosen.map((p) => ({ id: p.id, name: p.name, price: discounted(p), image: p.images[0]?.src })),
      { message: `Woven and in your bag. You saved ${formatPrice(savings)}` },
    );
    setSlots([null, null, null]);
    setLast(null);
  };

  const caption = full
    ? "Woven as one"
    : last
      ? last.name
      : chosen.length
        ? `${3 - chosen.length} more to weave`
        : "Choose a fabric to weave it in";

  return (
    <section id="weave" className="relative scroll-mt-24 overflow-hidden bg-paper pt-20 pb-16 sm:pt-24 sm:pb-24">
      {/* Ribbons run full-bleed behind the heading */}
      <div className="relative h-[clamp(300px,50svh,540px)]">
        <WebGLBoundary>
          <WeaveRibbons slots={specs} braided={full} />
        </WebGLBoundary>
        <div className="pointer-events-none relative z-10 flex h-full items-center justify-center px-4">
          <div className="relative">
            <div className="absolute -inset-x-10 -inset-y-6 rounded-full bg-paper/85 blur-2xl" aria-hidden />
            <SectionHeading copy={copy} align="center" className="relative" />
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-2 items-end gap-x-6 gap-y-8 px-4 sm:px-6 lg:grid-cols-[1fr_auto_1fr]">
        {/* Centre: caption + swatches (first on mobile) */}
        <div className="col-span-2 flex flex-col items-center lg:col-span-1 lg:col-start-2 lg:row-start-1">
          <p
            key={caption}
            aria-live="polite"
            className="animate-[weavefade_0.6s_ease-out] font-display text-xl text-ink italic sm:text-2xl"
          >
            {caption}
          </p>
          <style>{`@keyframes weavefade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
          <div className="mt-4 flex max-w-xl flex-wrap justify-center gap-2.5 sm:gap-3">
            {products.map((p) => {
              const at = slots.findIndex((x) => x?.id === p.id);
              const on = at >= 0;
              const locked = full && !on;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p)}
                  disabled={locked}
                  aria-pressed={on}
                  aria-label={on ? `Remove ${p.name} from the weave` : `Weave ${p.name}`}
                  title={p.name}
                  className={`relative size-10 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08),0_6px_14px_-6px_rgba(0,0,0,0.35)] transition-all duration-300 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-pink disabled:pointer-events-none disabled:opacity-30 disabled:grayscale sm:size-12 ${
                    on ? "scale-110 ring-2 ring-pink ring-offset-2 ring-offset-paper" : ""
                  }`}
                  style={{ background: swatchBg(p) }}
                >
                  {on && (
                    <span className="absolute inset-0 grid place-items-center rounded-full bg-black/35 font-display text-sm font-semibold text-white">
                      {NUMERALS[at]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Left: the chosen threads */}
        <ol className="col-span-1 space-y-2 lg:col-start-1 lg:row-start-1 lg:max-w-xs">
          {slots.map((p, i) => (
            <li key={i} className="flex items-center gap-3 border-b border-ink/10 pb-2 text-sm">
              <span className="w-7 font-display text-base font-semibold text-pink">{NUMERALS[i]}</span>
              {p ? (
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  aria-label={`Remove ${p.name}`}
                  className="group flex min-w-0 flex-1 items-center justify-between gap-2 text-left text-ink focus-visible:outline-2 focus-visible:outline-pink"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="size-3 shrink-0 rounded-full" style={{ background: swatchBg(p) }} />
                    <span className="truncate">{p.name}</span>
                  </span>
                  <span aria-hidden className="text-ink-soft transition-colors group-hover:text-pink">
                    ×
                  </span>
                </button>
              ) : (
                <span className="text-ink-soft/60 italic">Awaiting a fabric</span>
              )}
            </li>
          ))}
        </ol>

        {/* Right: price + add */}
        <div className="col-span-1 flex flex-col items-end text-right lg:col-start-3 lg:row-start-1">
          <p className="text-[11px] font-semibold tracking-[0.28em] text-ink-soft uppercase">
            Any three · {pct}% off
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            {regular > 0 && savings > 0 && (
              <span className="text-xs text-ink-soft line-through sm:text-sm">{formatPrice(regular)}</span>
            )}
            <span className="font-display text-3xl font-medium text-ink sm:text-4xl">{formatPrice(total)}</span>
          </div>
          <button
            type="button"
            onClick={weave}
            disabled={!full}
            className="mt-3 rounded-full bg-pink px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_-12px_rgba(227,24,125,0.9)] transition-all hover:bg-pink-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink disabled:cursor-not-allowed disabled:bg-ink/15 disabled:text-ink-soft disabled:shadow-none"
          >
            Add to bag
          </button>
        </div>
      </div>
    </section>
  );
}
