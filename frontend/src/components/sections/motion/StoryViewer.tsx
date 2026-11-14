"use client";
// Full-screen story viewer: blurred backdrop, segmented auto-advancing progress, tap/hold/swipe
// controls, 3D neighbours, focus trap and scroll lock.
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/catalog";
import { useCart } from "@/components/cart/CartProvider";
import { ProductMedia } from "../media/ProductMedia";

const STORY_SECONDS = 5;

export function StoryViewer({
  products,
  index,
  onIndex,
  onClose,
}: {
  products: Product[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const n = products.length;
  const p = products[index];
  const dialog = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const bars = useRef<(HTMLDivElement | null)[]>([]);
  const tween = useRef<gsap.core.Tween | null>(null);
  const hold = useRef<{ t: number; y: number; held: boolean } | null>(null);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { add } = useCart();

  const next = useCallback(() => (index < n - 1 ? onIndex(index + 1) : onClose()), [index, n, onIndex, onClose]);
  const prev = useCallback(() => onIndex(Math.max(0, index - 1)), [index, onIndex]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Scroll lock + focus management.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const html = document.documentElement;
    const old = html.style.overflow;
    html.style.overflow = "hidden";
    dialog.current?.querySelector<HTMLElement>("[data-close]")?.focus();
    return () => {
      html.style.overflow = old;
      before?.focus?.();
    };
  }, []);

  // Segment progress for the current story.
  useEffect(() => {
    bars.current.forEach((b, k) => b && gsap.set(b, { scaleX: k < index ? 1 : 0 }));
    const cur = bars.current[index];
    if (!cur) return;
    tween.current = gsap.to(cur, { scaleX: 1, duration: STORY_SECONDS, ease: "none", onComplete: next });
    return () => {
      tween.current?.kill();
    };
  }, [index, next]);

  // Story change animation.
  useEffect(() => {
    if (!card.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      gsap.fromTo("[data-media]", { opacity: 0.2 }, { opacity: 1, duration: 0.5 });
      gsap.fromTo("[data-info] > *", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.06, ease: "power3.out" });
      if (!reduce) gsap.fromTo("[data-kb]", { scale: 1.02 }, { scale: 1.15, duration: STORY_SECONDS + 2, ease: "none" });
    }, dialog);
    return () => ctx.revert();
  }, [index]);

  // Keyboard + focus trap.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Tab" && dialog.current) {
        const f = Array.from(dialog.current.querySelectorAll<HTMLElement>("button, a[href]")).filter((x) => x.offsetParent !== null);
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onClose]);

  if (!p || typeof document === "undefined") return null;

  const down = (e: React.PointerEvent) => {
    hold.current = { t: Date.now(), y: e.clientY, held: false };
    tween.current?.pause();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    const h = hold.current;
    if (!h || e.pointerType !== "touch") return;
    const dy = e.clientY - h.y;
    if (dy > 12) gsap.set(card.current, { y: dy, scale: 1 - Math.min(dy, 300) / 1500 });
  };
  const up = (e: React.PointerEvent) => {
    const h = hold.current;
    hold.current = null;
    if (!h) return;
    const dy = e.clientY - h.y;
    if (e.pointerType === "touch" && dy > 110) return onClose();
    gsap.to(card.current, { y: 0, scale: 1, duration: 0.3 });
    tween.current?.resume();
    if (Date.now() - h.t < 250 && Math.abs(dy) < 20) {
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      if (e.clientX - r.left < r.width * 0.35) prev();
      else next();
    }
  };

  const side = (k: number, pos: "left" | "right") => {
    const s = products[k];
    if (!s) return null;
    return (
      <button
        type="button"
        onClick={() => onIndex(k)}
        aria-label={`${pos === "left" ? "Previous" : "Next"} reel: ${s.name}`}
        className={`absolute top-1/2 hidden aspect-[9/16] w-[min(220px,18vw)] -translate-y-1/2 overflow-hidden rounded-2xl opacity-60 blur-[3px] transition duration-500 hover:opacity-90 hover:blur-[1px] focus-visible:opacity-90 focus-visible:blur-0 focus-visible:ring-2 focus-visible:ring-pink focus-visible:outline-none md:block ${
          pos === "left" ? "left-[max(1rem,calc(50%-420px))]" : "right-[max(1rem,calc(50%-420px))]"
        }`}
        style={{ transform: `translateY(-50%) rotateY(${pos === "left" ? 28 : -28}deg) scale(0.9)` }}
      >
        <ProductMedia product={s} sizes="220px" />
        <span className="absolute inset-0 bg-black/30" />
      </button>
    );
  };

  const iconBtn = "grid h-9 w-9 place-items-center rounded-full text-white transition hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none";

  return createPortal(
    <div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-label={`Reel: ${p.name}`}
      data-lenis-prevent
      className={`fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-black transition-opacity duration-300 ${mounted ? "opacity-100" : "opacity-0"}`}
    >
      {/* blurred backdrop */}
      <div key={`bg${index}`} aria-hidden className="absolute inset-[-10%] scale-110 blur-3xl brightness-[0.35] saturate-150">
        <ProductMedia product={p} sizes="30vw" />
      </div>

      <div className="relative flex h-full w-full items-center justify-center" style={{ perspective: "1400px" }}>
        {side(index - 1, "left")}
        {side(index + 1, "right")}

        <div
          ref={card}
          className="relative aspect-[9/16] w-[min(420px,100vw,calc((100dvh-3.5rem)*9/16))] touch-none overflow-hidden rounded-2xl bg-ink shadow-[0_40px_120px_-20px_rgba(0,0,0,0.8)] select-none"
        >
          <div key={`m${index}`} data-media className="absolute inset-0">
            <div data-kb className="absolute inset-0">
              <ProductMedia product={p} sizes="420px" priority />
            </div>
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-transparent via-40% to-black/90" />

          {/* tap / hold / swipe layer */}
          <div className="absolute inset-0 z-10" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { hold.current = null; tween.current?.resume(); }} />

          {/* top */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3">
            <div className="flex gap-1" aria-hidden>
              {products.map((s, k) => (
                <div key={s.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
                  <div ref={(el) => { bars.current[k] = el; }} className="h-full origin-left bg-white" style={{ transform: `scaleX(${k < index ? 1 : 0})` }} />
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-pink font-display text-lg text-white" aria-hidden>A</span>
              <div className="min-w-0 flex-1 leading-tight text-white">
                <p className="text-sm font-semibold">anashion</p>
                <p className="truncate text-[11px] text-white/75">{p.categories[0]?.name ?? "Bridal couture"}</p>
              </div>
              <button type="button" aria-label={muted ? "Unmute" : "Mute"} aria-pressed={!muted} onClick={() => setMuted((m) => !m)} className={`${iconBtn} pointer-events-auto`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  {muted ? <path d="M22 9l-6 6M16 9l6 6" /> : <path d="M15.5 8.5a5 5 0 010 7M19 5a10 10 0 010 14" />}
                </svg>
              </button>
              <button type="button" data-close aria-label="Close" onClick={onClose} className={`${iconBtn} pointer-events-auto`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M5 5l14 14M19 5L5 19" /></svg>
              </button>
            </div>
          </div>

          {/* bottom */}
          <div data-info key={`i${index}`} className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-start gap-1.5 p-4 pb-5 text-white">
            <p className="text-[10px] font-semibold tracking-[0.3em] text-gold-soft uppercase">{p.categories[0]?.name}</p>
            <h3 className="font-display text-3xl leading-none">{p.name}</h3>
            <p className="line-clamp-2 text-xs text-white/80">{p.shortDescription}</p>
            <p className="text-sm font-semibold">
              {p.onSale && <span className="mr-2 font-normal text-white/60 line-through">{formatPrice(p.regularPrice)}</span>}
              {formatPrice(p.price)}
            </p>
            <div className="pointer-events-auto mt-2 flex w-full items-center gap-2">
              <button
                type="button"
                onClick={() => add({ id: p.id, name: p.name, price: p.price, image: p.images[0]?.src, size: p.sizes[0] }, { message: `${p.name} added to your bag` })}
                className="rounded-full bg-pink px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-pink-deep focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              >
                Add to bag
              </button>
              <button type="button" aria-label={liked ? "Unlike" : "Like"} aria-pressed={liked} onClick={() => setLiked((l) => !l)} className={`${iconBtn} border border-white/30`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill={liked ? "#e3187d" : "none"} stroke={liked ? "#e3187d" : "currentColor"} strokeWidth="2" aria-hidden>
                  <path d="M12 21s-7-4.6-9.3-9A5.4 5.4 0 0112 6.6 5.4 5.4 0 0121.3 12C19 16.4 12 21 12 21z" />
                </svg>
              </button>
              <a href="#rail" onClick={onClose} className="ml-auto text-xs font-semibold tracking-wide text-white/90 underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none">
                More drapes &rarr;
              </a>
            </div>
          </div>
        </div>

        <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[11px] tracking-wide text-white/60">
          Tap sides to skip &middot; Hold to pause &middot; Swipe down to close
        </p>
      </div>
    </div>,
    document.body,
  );
}
