"use client";
// Garment quick view for The Rail: big hanger image on a soft gradient with a Show back/front flip, stock badge,
// name, price, colour and size pills, Add to bag, and "See it on the model" (opens the lookbook QuickView).
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/catalog";
import { useCart } from "@/components/cart/CartProvider";
import { Face, tagsOf } from "./Face";

const FOCUSABLE = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

export function HangerModal({ product: p, paused, onModel, onClose }: { product: Product; paused: boolean; onModel: () => void; onClose: () => void }) {
  const { add } = useCart();
  const dialog = useRef<HTMLDivElement>(null);
  const closing = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [colour, setColour] = useState(0);
  const [back, setBack] = useState(false);
  const [size, setSize] = useState("");
  const [needSize, setNeedSize] = useState(false);
  const [added, setAdded] = useState(false);
  const tags = tagsOf(p);
  const t = tags[colour];
  const price = (
    <p className="mt-2 text-xl font-semibold text-pink">
      {formatPrice(p.price)}
      {p.onSale && <span className="ml-2 text-sm font-normal text-ink-soft line-through">{formatPrice(p.regularPrice)}</span>}
    </p>
  );

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    setMounted(false);
    setTimeout(onClose, 240);
  }, [onClose]);

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

  useEffect(() => {
    if (paused) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "Tab" && dialog.current) {
        const f = Array.from(dialog.current.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (!f.length) return;
        const a = document.activeElement;
        if (!dialog.current.contains(a) || (e.shiftKey && a === f[0])) {
          e.preventDefault();
          f[e.shiftKey && dialog.current.contains(a) ? f.length - 1 : 0].focus();
        } else if (!e.shiftKey && a === f[f.length - 1]) {
          e.preventDefault();
          f[0].focus();
        }
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [close, paused]);

  const addToBag = () => {
    if (p.sizes.length && !size) return setNeedSize(true);
    add({ id: p.id, name: p.colorways.length ? `${p.name}, ${t.name}` : p.name, price: p.price, image: p.colorways[colour]?.hanger?.front?.src ?? p.garment.front?.src ?? p.images[0]?.src, size: size || undefined });
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  };

  const face = { backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" } as const;
  const pill = (on: boolean) =>
    `rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-pink focus-visible:outline-none ${on ? "border-pink bg-pink text-white" : "border-ink/15 bg-white text-ink hover:border-pink"}`;

  return createPortal(
    <div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-label={`Quick view: ${p.name}`}
      data-lenis-prevent
      onClick={close}
      className={`fixed inset-0 z-[85] flex items-stretch justify-center bg-wine/40 transition-opacity duration-300 md:items-center md:p-6 ${mounted ? "opacity-100" : "opacity-0"}`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative flex h-full w-full flex-col overflow-y-auto bg-white shadow-[0_40px_90px_-30px_rgba(58,10,34,0.6)] transition duration-300 md:h-auto md:max-h-[88dvh] md:max-w-4xl md:flex-row md:overflow-hidden md:rounded-3xl ${mounted ? "translate-y-0" : "translate-y-6"}`}
      >
        <div className="flex shrink-0 flex-col items-center gap-3 bg-gradient-to-br from-[#f2f0ee] via-[#f7f4f2] to-[#ece5e3] p-5 md:w-[48%]">
          <div className="relative h-[min(52dvh,420px)] w-full max-w-[340px] md:h-[min(60dvh,500px)]" style={{ perspective: "1400px" }}>
            <div
              className="relative h-full w-full transition-transform duration-[800ms] ease-[cubic-bezier(.4,.1,.2,1)] motion-reduce:duration-0"
              style={{ transformStyle: "preserve-3d", transform: back ? "rotateY(180deg)" : "none" }}
            >
              <div key={`f${colour}`} className="absolute inset-0" style={face}>
                <Face p={p} view="front" colour={colour} sizes="340px" />
              </div>
              {(
                <div key={`b${colour}`} className="absolute inset-0" style={{ ...face, transform: "rotateY(180deg)" }}>
                  <Face p={p} view="back" colour={colour} sizes="340px" />
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setBack((b) => !b)}
            aria-pressed={back}
            className="rounded-full border border-ink/20 bg-white px-5 py-2 text-xs font-bold tracking-[0.16em] text-ink uppercase transition hover:border-pink hover:text-pink focus-visible:ring-2 focus-visible:ring-pink focus-visible:outline-none"
          >
            {back ? "Show front" : "Show back"}
          </button>
        </div>

        <div className="flex flex-1 flex-col p-6 sm:p-8 md:overflow-y-auto">
          <button
            data-close
            onClick={close}
            aria-label="Close quick view"
            className="absolute top-3 right-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-xl shadow transition hover:bg-pink hover:text-white focus-visible:ring-2 focus-visible:ring-pink focus-visible:outline-none"
          >
            ×
          </button>
          <span className={`w-fit rounded-full px-3 py-1 text-[11px] font-bold tracking-wider uppercase ${p.inStock ? "bg-emerald-50 text-emerald-700" : "bg-mist text-ink-soft"}`}>{p.inStock ? "In stock" : "Sold out"}</span>
          <h3 className="mt-3 font-display text-3xl leading-tight font-semibold text-ink sm:text-4xl">{p.name}</h3>
          {price}
          {p.shortDescription && <p className="mt-3 text-sm leading-relaxed text-ink-soft">{p.shortDescription}</p>}

          <p className="mt-5 text-xs font-semibold tracking-widest text-ink-soft uppercase">
            Colour <span className="font-medium tracking-normal text-ink normal-case">{p.colorways.length ? t.name : ""}</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Colour">
            {tags.map((c, i) => (
              <button key={`${c.name}${i}`} onClick={() => setColour(i)} aria-pressed={colour === i} className={`flex items-center gap-2 rounded-full border py-1.5 pr-4 pl-2 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-pink focus-visible:outline-none ${colour === i ? "border-pink bg-pink/10" : "border-ink/15 bg-white hover:border-pink"}`}>
                <span className="h-5 w-5 rounded-full border border-black/15" style={{ background: c.hex }} />
                {c.name}
              </button>
            ))}
          </div>

          {p.sizes.length > 0 && (
            <>
              <p className="mt-5 text-xs font-semibold tracking-widest text-ink-soft uppercase">Size</p>
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Size">
                {p.sizes.map((s) => (
                  <button key={s} onClick={() => { setSize(s); setNeedSize(false); }} aria-pressed={size === s} className={pill(size === s)}>
                    {s}
                  </button>
                ))}
              </div>
              {needSize && <p role="alert" className="mt-2 text-xs font-medium text-pink-deep">Please choose a size first.</p>}
            </>
          )}

          <div className="mt-auto flex flex-col gap-3 pt-6">
            <button onClick={addToBag} className="w-full rounded-full bg-pink py-3.5 text-sm font-semibold text-white transition-colors hover:bg-pink-deep focus-visible:ring-2 focus-visible:ring-pink focus-visible:ring-offset-2 focus-visible:outline-none">
              {added ? "Added to bag ✓" : "Add to bag"}
            </button>
            <button onClick={onModel} className="w-full rounded-full border border-ink/25 py-3 text-sm font-semibold text-ink transition hover:border-pink hover:text-pink focus-visible:ring-2 focus-visible:ring-pink focus-visible:outline-none">
              See it on the model
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
