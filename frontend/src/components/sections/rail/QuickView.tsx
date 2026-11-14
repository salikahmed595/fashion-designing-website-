"use client";
// Quick view modal for The Rail: a front/back flip stage with detail thumbnails on the left, tags, colour tags
// (which crossfade the stage photos), size pills and add-to-bag on the right. Portal, focus trap, scroll lock.
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { gsap } from "gsap";
import type { Category, Product, ProductImage } from "@/lib/types";
import { formatPrice, swatchOf } from "@/lib/catalog";
import { useCart } from "@/components/cart/CartProvider";

const FOCUSABLE = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

/** Image that crossfades from the previous src to the new one. */
function FadeImage({ img, fallback, sizes, priority }: { img: ProductImage | undefined; fallback: string; sizes: string; priority?: boolean }) {
  const src = img?.src ?? "";
  const [seen, setSeen] = useState(src);
  const [prev, setPrev] = useState<ProductImage | undefined>(undefined);
  const top = useRef<HTMLDivElement>(null);
  const [cur, setCur] = useState(img);

  if (src !== seen) {
    setSeen(src);
    setPrev(cur);
    setCur(img);
  }

  useEffect(() => {
    if (!prev || !top.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tween = gsap.fromTo(top.current, { opacity: 0 }, { opacity: 1, duration: reduce ? 0 : 0.55, ease: "power2.out" });
    const t = setTimeout(() => setPrev(undefined), reduce ? 0 : 650);
    return () => {
      tween.kill();
      clearTimeout(t);
    };
  }, [prev]);

  const layer = (i: ProductImage | undefined, ref?: React.Ref<HTMLDivElement>, p?: boolean) => (
    <div ref={ref} className="absolute inset-0">
      {i && <Image src={i.src} alt={i.alt} fill priority={p} draggable={false} sizes={sizes} className="object-cover object-[50%_8%]" />}
    </div>
  );

  return (
    <div className="absolute inset-0" style={{ background: fallback }}>
      {prev && layer(prev)}
      {layer(cur, top, priority)}
    </div>
  );
}

export function QuickView({
  product,
  garmentTypes,
  onClose,
}: {
  product: Product;
  garmentTypes: Category[];
  onClose: () => void;
}) {
  const { add } = useCart();
  const dialog = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const closing = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [colour, setColour] = useState(0);
  const [face, setFace] = useState<"front" | "back">("front");
  const [detail, setDetail] = useState<number | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [needSize, setNeedSize] = useState(false);

  const p = product;
  const sw = swatchOf(p);
  const gradient = `linear-gradient(165deg, ${sw[0]}, ${sw[1]} 60%, ${sw[2]})`;
  const cw = p.colorways.length ? p.colorways[Math.min(colour, p.colorways.length - 1)] : null;
  const frontImg = cw?.images[0] ?? p.images[0];
  const backImg = cw?.images[1] ?? p.images[1];
  const details = p.images.slice(2);
  const detailImg = detail !== null ? details[detail] : undefined;
  const garment = garmentTypes.find((g) => p.categories.some((c) => c.slug === g.slug));
  const tags = ["Hand embroidered", "Made to measure", ...(p.onSale ? ["On sale"] : [])];

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    setMounted(false);
    setTimeout(onClose, 260);
  }, [onClose]);

  // Enter animation, scroll lock and focus return.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const html = document.documentElement;
    const old = html.style.overflow;
    html.style.overflow = "hidden";
    const raf = requestAnimationFrame(() => {
      setMounted(true);
      dialog.current?.querySelector<HTMLElement>("[data-close]")?.focus();
    });
    return () => {
      cancelAnimationFrame(raf);
      html.style.overflow = old;
      before?.focus?.();
    };
  }, []);

  // Escape + focus trap.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "Tab" && dialog.current) {
        const f = Array.from(dialog.current.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        const a = document.activeElement;
        if (!dialog.current.contains(a)) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && a === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && a === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [close]);

  const flipTo = (f: "front" | "back") => {
    setDetail(null);
    setFace(f);
  };

  const addToBag = () => {
    if (p.sizes.length && !size) {
      setNeedSize(true);
      return;
    }
    add({
      id: p.id,
      name: cw ? `${p.name}, ${cw.name}` : p.name,
      price: p.price,
      image: frontImg?.src,
      size: size ?? undefined,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  };

  const pill = (on: boolean) =>
    `rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-pink focus-visible:outline-none ${
      on ? "border-pink bg-pink text-white" : "border-ink/15 bg-white text-ink hover:border-pink"
    }`;
  const face3d = { backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" } as const;

  return createPortal(
    <div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-label={`Quick view: ${p.name}`}
      data-lenis-prevent
      onClick={close}
      className={`fixed inset-0 z-[90] flex items-stretch justify-center bg-wine/45 backdrop-blur-md transition-opacity duration-300 md:items-center md:p-6 ${mounted ? "opacity-100" : "opacity-0"}`}
    >
      <div
        ref={card}
        onClick={(e) => e.stopPropagation()}
        className={`relative flex h-full w-full flex-col overflow-y-auto bg-white shadow-[0_40px_90px_-30px_rgba(58,10,34,0.6)] transition duration-300 md:h-[min(88dvh,740px)] md:max-w-5xl md:flex-row md:overflow-hidden md:rounded-3xl ${
          mounted ? "translate-y-0 scale-100" : "translate-y-8 scale-[0.97]"
        }`}
      >
        {/* Left: stage */}
        <div className="flex shrink-0 flex-col gap-3 bg-mist/60 p-4 md:w-[46%] md:p-5">
          <div className="relative mx-auto aspect-[4/5] w-full max-w-[420px] md:aspect-auto md:min-h-0 md:max-w-none md:flex-1">
            <div className="absolute inset-0" style={{ perspective: "1500px" }}>
              <div
                className="relative h-full w-full transition-transform duration-[800ms] ease-[cubic-bezier(.4,.1,.2,1)] motion-reduce:duration-0"
                style={{ transformStyle: "preserve-3d", transform: face === "back" && backImg ? "rotateY(180deg)" : "rotateY(0)" }}
              >
                <div className="absolute inset-0 overflow-hidden rounded-2xl shadow-md" style={face3d}>
                  <FadeImage img={frontImg} fallback={gradient} sizes="(min-width:768px) 480px, 90vw" priority />
                </div>
                {backImg && (
                  <div className="absolute inset-0 overflow-hidden rounded-2xl shadow-md" style={{ ...face3d, transform: "rotateY(180deg)" }}>
                    <FadeImage img={backImg} fallback={gradient} sizes="(min-width:768px) 480px, 90vw" />
                  </div>
                )}
              </div>
            </div>
            {detailImg && (
              <div className="absolute inset-0 overflow-hidden rounded-2xl shadow-md">
                <FadeImage img={detailImg} fallback={gradient} sizes="(min-width:768px) 480px, 90vw" />
              </div>
            )}
            {backImg && (
              <div role="group" aria-label="View" className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1 rounded-full bg-white/90 p-1 shadow-md backdrop-blur">
                {(["front", "back"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => flipTo(f)}
                    aria-pressed={!detailImg && face === f}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide capitalize transition focus-visible:ring-2 focus-visible:ring-pink focus-visible:outline-none ${
                      !detailImg && face === f ? "bg-pink text-white" : "text-ink hover:text-pink"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}
          </div>
          {details.length > 0 && (
            <div className="no-scrollbar flex shrink-0 justify-center gap-2 overflow-x-auto" role="group" aria-label="Detail photos">
              {details.map((d, i) => (
                <button
                  key={d.src}
                  onClick={() => setDetail(detail === i ? null : i)}
                  aria-label={`Detail ${i + 1}`}
                  aria-pressed={detail === i}
                  className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition focus-visible:ring-2 focus-visible:ring-pink focus-visible:outline-none ${
                    detail === i ? "border-pink" : "border-transparent opacity-80 hover:opacity-100"
                  }`}
                >
                  <Image src={d.src} alt="" fill sizes="56px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: details */}
        <div className="flex flex-1 flex-col p-5 sm:p-7 md:min-h-0 md:overflow-y-auto">
          <div className="flex flex-wrap items-center gap-1.5 pr-12">
            {garment && <span className="rounded-full bg-pink px-3 py-1 text-[11px] font-bold tracking-wider text-white uppercase">{garment.name}</span>}
            {tags.map((t) => (
              <span key={t} className="rounded-full border border-ink/15 bg-paper px-3 py-1 text-[11px] font-medium text-ink-soft">
                {t}
              </span>
            ))}
          </div>
          <button
            data-close
            onClick={close}
            aria-label="Close quick view"
            className="absolute top-3 right-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-xl shadow transition hover:bg-pink hover:text-white focus-visible:ring-2 focus-visible:ring-pink focus-visible:outline-none"
          >
            ×
          </button>

          <h3 className="mt-4 font-display text-3xl leading-tight font-semibold text-ink sm:text-4xl">{p.name}</h3>
          <p className="mt-2 text-lg font-semibold text-pink">
            {formatPrice(p.price)}
            {p.onSale && <span className="ml-2 text-sm font-normal text-ink-soft line-through">{formatPrice(p.regularPrice)}</span>}
          </p>
          {p.shortDescription && <p className="mt-3 text-sm leading-relaxed text-ink-soft">{p.shortDescription}</p>}

          <div className="mt-5">
            {p.colorways.length > 0 ? (
              <>
                <p className="text-xs font-semibold tracking-widest text-ink-soft uppercase">
                  Colour <span className="font-medium tracking-normal text-ink normal-case">{cw?.name}</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Colour">
                  {p.colorways.map((c, i) => (
                    <button
                      key={c.name}
                      onClick={() => {
                        setColour(i);
                        setDetail(null);
                      }}
                      aria-pressed={colour === i}
                      className={`flex items-center gap-2 rounded-full border py-1.5 pr-4 pl-2 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-pink focus-visible:outline-none ${
                        colour === i ? "border-pink bg-pink/10 text-ink" : "border-ink/15 bg-white text-ink hover:border-pink"
                      }`}
                    >
                      <span className="h-5 w-5 rounded-full border border-black/15" style={{ background: c.hex }} />
                      {c.name}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2" aria-label="Available colours" role="img">
                {sw.map((c) => (
                  <span key={c} className="h-5 w-5 rounded-full border border-black/15" style={{ background: c }} />
                ))}
              </div>
            )}
          </div>

          {p.sizes.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-semibold tracking-widest text-ink-soft uppercase">Size</p>
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Size">
                {p.sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setSize(s);
                      setNeedSize(false);
                    }}
                    aria-pressed={size === s}
                    className={pill(size === s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {needSize && (
                <p role="alert" className="mt-2 text-xs font-medium text-pink-deep">
                  Please choose a size first.
                </p>
              )}
            </div>
          )}

          <div className="mt-auto flex flex-wrap items-center gap-3 pt-6">
            <button
              onClick={addToBag}
              aria-live="polite"
              className="rounded-full bg-pink px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-pink-deep focus-visible:ring-2 focus-visible:ring-pink focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {added ? "Added to bag ✓" : "Add to bag"}
            </button>
            <button
              onClick={close}
              className="rounded-full border border-ink/20 px-6 py-3 text-sm font-semibold text-ink transition hover:border-pink hover:text-pink focus-visible:ring-2 focus-visible:ring-pink focus-visible:outline-none"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
