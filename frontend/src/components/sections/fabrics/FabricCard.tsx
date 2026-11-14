// One tall portrait card on the "Pick a Fabric" arc: solid swatch colour, huge
// stacked condensed product name overlapping the centred photo, price and a +.
import { forwardRef } from "react";
import { formatPrice, swatchOf } from "@/lib/catalog";
import type { Product } from "@/lib/types";
import { ProductMedia } from "../media/ProductMedia";

/** Relative luminance (0..1) of a #rrggbb colour, to pick readable text. */
function luminance(hex: string) {
  const m = hex.replace("#", "");
  const v = m.length === 3 ? m.split("").map((c) => c + c).join("") : m.padEnd(6, "0");
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(v.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Split a name into at most 3 stacked lines. */
function stack(name: string) {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length <= 3) return words;
  const lines = words.slice(0, 2);
  lines.push(words.slice(2).join(" "));
  return lines;
}

type Props = {
  product: Product;
  onAdd: () => void;
  onFocusCard: () => void;
};

export const FabricCard = forwardRef<HTMLElement, Props>(function FabricCard(
  { product: p, onAdd, onFocusCard },
  ref,
) {
  const bg = swatchOf(p)[0] ?? "#e3187d";
  const light = luminance(bg) > 0.45;
  const lines = stack(p.name);
  const longest = Math.max(...lines.map((l) => l.length), 4);
  // Fit the longest line to ~86% of the card width (uppercase serif ≈ 0.72em/char).
  const fontScale = Math.min(0.2, 0.86 / (longest * 0.72));

  return (
    <article
      ref={ref}
      aria-label={p.name}
      className="absolute top-1/2 left-1/2 overflow-hidden rounded-[26px] shadow-[0_30px_60px_-25px_rgba(20,17,20,0.45)] will-change-[transform,filter,opacity] select-none"
      style={{
        width: "var(--cw)",
        height: "calc(var(--cw) * 1.42)",
        marginLeft: "calc(var(--cw) * -0.5)",
        marginTop: "calc(var(--cw) * -0.71)",
        background: `linear-gradient(160deg, ${bg}, color-mix(in srgb, ${bg} 78%, #000))`,
        color: light ? "var(--ink)" : "#fff",
      }}
    >
      <div className="absolute inset-x-[13%] top-[25%] bottom-[17%] overflow-hidden rounded-[18px] shadow-[0_16px_30px_-12px_rgba(0,0,0,0.5)]">
        <ProductMedia product={p} sizes="(min-width: 640px) 240px, 170px" className="pointer-events-none" />
      </div>

      <h3
        aria-hidden
        className="pointer-events-none relative z-10 origin-top-left px-[7%] pt-[7%] font-display leading-[0.8] font-semibold tracking-[-0.01em] uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.18)]"
        style={{ fontSize: `calc(var(--cw) * ${fontScale.toFixed(4)})`, transform: "scaleY(1.22)" }}
      >
        {lines.map((l, i) => (
          <span key={i} className="block">
            {l}
          </span>
        ))}
      </h3>

      <div className="absolute inset-x-[7%] bottom-[5%] flex items-end justify-between">
        <div className="leading-tight">
          <p className="text-sm font-bold sm:text-base">{formatPrice(p.price, p.currency)}</p>
          {p.onSale && p.regularPrice > p.price && (
            <p className="text-[11px] line-through opacity-70">{formatPrice(p.regularPrice, p.currency)}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onAdd}
          onFocus={onFocusCard}
          aria-label={`Add ${p.name} to bag`}
          className={`grid size-10 place-items-center rounded-full text-xl leading-none shadow-lg transition-transform duration-300 hover:scale-110 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 ${
            light ? "bg-ink text-white focus-visible:outline-ink" : "bg-white text-ink focus-visible:outline-white"
          }`}
        >
          +
        </button>
      </div>
    </article>
  );
});
