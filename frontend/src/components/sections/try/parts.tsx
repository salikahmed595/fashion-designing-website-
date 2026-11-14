// Helpers for TryTheLook: the piece rows of a look, the model visual (cut-out or framed photo), and hotspot dots.
import Image from "next/image";
import type { Piece, Product } from "@/lib/types";
import { swatchOf } from "@/lib/catalog";

/** Preset hotspot positions (% of the model box): neck, shoulder, waist, thigh, knee, hem... */
const SPOTS: [number, number][] = [
  [50, 15],
  [38, 26],
  [58, 44],
  [44, 60],
  [60, 76],
  [48, 90],
];

/** Pieces of a look; a look without grouped children is a single piece. */
export const lookRows = (p: Product): Piece[] =>
  p.pieces.length ? p.pieces : [{ id: p.id, name: p.name, price: p.price, image: p.images[0] ?? null }];

const gradientOf = (p: Product) => {
  const c = swatchOf(p);
  return `linear-gradient(170deg, ${c[0]}33 0%, ${c[1] ?? c[0]}55 55%, ${c[2] ?? c[0]}66 100%)`;
};

/** The model picture: transparent cut-out (contained, never cropped) or a rounded photo frame as fallback. */
export function ModelVisual({
  product,
  sizes,
  onAspect,
}: {
  product: Product;
  sizes: string;
  onAspect?: (ratio: number) => void;
}) {
  if (product.cutout) {
    return (
      <Image
        src={product.cutout.src}
        alt={product.cutout.alt || product.name}
        fill
        sizes={sizes}
        draggable={false}
        onLoad={(e) => {
          const im = e.currentTarget;
          if (im.naturalHeight) onAspect?.(im.naturalWidth / im.naturalHeight);
        }}
        className="object-contain object-bottom drop-shadow-[0_10px_14px_rgba(58,10,34,0.14)]"
      />
    );
  }
  const first = product.images[0];
  return (
    <div className="absolute inset-0 overflow-hidden rounded-3xl shadow-lg" style={{ background: gradientOf(product) }}>
      {first && <Image src={first.src} alt={first.alt || product.name} fill sizes={sizes} className="object-cover object-top" />}
    </div>
  );
}

export function Hotspots({
  rows,
  hover,
  setHover,
}: {
  rows: Piece[];
  hover: number | null;
  setHover: (i: number | null) => void;
}) {
  return (
    <>
      {rows.map((r, i) => {
        const [x, y] = SPOTS[i % SPOTS.length];
        const on = hover === i;
        return (
          <div key={`${r.id}-${i}`} className="absolute" style={{ left: `${x}%`, top: `${y}%`, zIndex: on ? 30 : 20 }}>
            <button
              type="button"
              data-hotspot
              aria-label={`Piece ${i + 1}: ${r.name}`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              onClick={(e) => e.stopPropagation()}
              className={`relative grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white text-[11px] font-bold shadow-lg transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-pink focus-visible:outline-none ${
                on ? "bg-pink text-white" : "bg-white text-ink"
              }`}
            >
              {on && <span className="absolute inset-0 animate-ping rounded-full bg-pink/40" />}
              <span className="relative">{i + 1}</span>
            </button>
            {on && (
              <div className="pointer-events-none absolute bottom-5 left-0 z-10 -translate-x-1/2 rounded-xl bg-white p-1.5 shadow-xl ring-1 ring-ink/10">
                <span className="relative block h-16 w-14 overflow-hidden rounded-lg bg-mist">
                  {r.image && <Image src={r.image.src} alt="" fill sizes="56px" className="object-cover object-top" />}
                </span>
                <span className="mt-1 block max-w-[84px] truncate text-center text-[10px] font-semibold text-ink">{r.name}</span>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
