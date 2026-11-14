"use client";
// "Pick a Fabric": tall swatch-coloured cards on a curved 3D arc (CSS perspective,
// no WebGL). Infinite loop: the arc never ends, it wraps around. Driven by mouse
// drag / swipe / arrow keys only (no scroll-jacking) plus a slow auto-advance that
// pauses on hover, focus and drag. Front card sharp; side cards recede and blur.
import { useCallback, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useCart } from "@/components/cart/CartProvider";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { Product, SectionCopy } from "@/lib/types";
import { FabricCard } from "./fabrics/FabricCard";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
/** Magnetic detent: holds near whole cards, moves quickly between them. */
const detent = (x: number) => {
  const f = Math.floor(x);
  const u = x - f;
  return f + u - (Math.sin(2 * Math.PI * u) / (2 * Math.PI)) * 0.85;
};

export function PickAFabric({ copy, products }: { copy: SectionCopy; products: Product[] }) {
  const { add } = useCart();
  const root = useRef<HTMLElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLElement | null)[]>([]);
  const n = products.length;
  const [front, setFront] = useState(0);

  // Mutable animation state (never triggers React renders).
  const s = useRef({
    user: 0, // target position in card units (unbounded: the arc loops)
    cur: 0, // eased, rendered position
    dragging: false,
    step: 22, // degrees between cards
    radius: 800, // px
    cw: 260, // card width px
    reduced: false,
    dirty: true,
    front: 0,
    hover: false,
    inView: false,
  });

  // Recompute geometry: fewer, wider-spaced cards on small screens.
  const measure = useCallback(() => {
    const st = s.current;
    const el = cards.current.find(Boolean);
    st.cw = el?.offsetWidth || 240;
    const narrow = window.innerWidth < 640;
    st.step = narrow ? 32 : 21;
    const rad = (st.step * Math.PI) / 180;
    st.radius = (st.cw * (narrow ? 1.02 : 1.08)) / (2 * Math.sin(rad / 2));
    st.dirty = true;
  }, []);

  const render = useCallback(() => {
    const st = s.current;
    const maxVis = window.innerWidth < 640 ? 2.2 : 3.6;
    cards.current.forEach((el, i) => {
      if (!el) return;
      // Shortest wrapped distance so the arc loops forever.
      let d = (((i - st.cur) % n) + n) % n;
      if (d > n / 2) d -= n;
      const ad = Math.abs(d);
      if (ad > maxVis + 0.6) {
        el.style.visibility = "hidden";
        return;
      }
      el.style.visibility = "visible";
      el.style.transform = `translateZ(${-st.radius}px) rotateY(${(d * st.step).toFixed(3)}deg) translateZ(${st.radius}px)`;
      el.style.opacity = String(clamp(1 - ad * 0.17, 0, 1) * clamp(maxVis + 0.6 - ad, 0, 1));
      el.style.filter =
        ad < 0.04 ? "none" : `blur(${Math.min(ad * 1.7, 6).toFixed(2)}px) saturate(${(1 - Math.min(ad, 2) * 0.12).toFixed(2)})`;
      el.style.zIndex = String(100 - Math.round(ad * 10));
    });
    const f = ((Math.round(st.cur) % n) + n) % n;
    if (f !== st.front) {
      st.front = f;
      setFront(f);
    }
  }, [n]);

  // Ease loop on the GSAP ticker (shared with Lenis and ScrollTrigger).
  useEffect(() => {
    if (!n) return;
    const st = s.current;
    st.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    measure();
    const ro = new ResizeObserver(measure);
    if (stage.current) ro.observe(stage.current);
    const tick = (_t: number, dtMs: number) => {
      const raw = st.user;
      const tgt = st.dragging || st.reduced ? raw : detent(raw);
      const k = st.reduced ? 1 : 1 - Math.exp(-(dtMs / 1000) * 7);
      const before = st.cur;
      st.cur += (tgt - st.cur) * k;
      if (Math.abs(st.cur - before) < 1e-5 && !st.dirty) return;
      st.dirty = false;
      render();
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      ro.disconnect();
    };
  }, [n, measure, render]);

  // Entrance only: no pinning, the page scrolls normally.
  useGSAP(
    () => {
      gsap.from("[data-card-wrap]", {
        autoAlpha: 0,
        y: 60,
        duration: 1.2,
        ease: "expo.out",
        scrollTrigger: { trigger: pin.current, start: "top 70%", once: true },
      });
    },
    { scope: root, dependencies: [n] },
  );

  /** Snap the arc to a (possibly out-of-range) position; it loops. */
  const go = useCallback((pos: number) => {
    s.current.user = Math.round(pos);
  }, []);
  /** Bring card i to the front by the shortest way round. */
  const goTo = useCallback(
    (i: number) => {
      const st = s.current;
      let d = (((i - st.user) % n) + n) % n;
      if (d > n / 2) d -= n;
      go(st.user + d);
    },
    [n, go],
  );

  // Slow auto-advance, paused on hover/drag/focus, when off-screen or hidden.
  useEffect(() => {
    if (n < 2) return;
    const st = s.current;
    const io = new IntersectionObserver(([e]) => (st.inView = e.isIntersecting), { threshold: 0.3 });
    if (root.current) io.observe(root.current);
    const id = window.setInterval(() => {
      const focused = stage.current?.contains(document.activeElement);
      if (st.reduced || st.hover || st.dragging || focused || !st.inView || document.hidden) return;
      go(st.user + 1);
    }, 3200);
    return () => {
      clearInterval(id);
      io.disconnect();
    };
  }, [n, go]);

  // Drag / swipe. Capture only after real movement so the + buttons still click.
  const drag = useRef({ id: -1, x: 0, start: 0, moved: false, lastX: 0, lastT: 0, v: 0 });
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    drag.current = { id: e.pointerId, x: e.clientX, start: s.current.user, moved: false, lastX: e.clientX, lastT: e.timeStamp, v: 0 };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 6) {
      d.moved = true;
      s.current.dragging = true;
      try {
        stage.current?.setPointerCapture(e.pointerId);
      } catch {
        /* pointer already released */
      }
    }
    if (!d.moved) return;
    const per = s.current.cw * 1.05;
    s.current.user = d.start - dx / per;
    const dt = Math.max(1, e.timeStamp - d.lastT);
    d.v = (-(e.clientX - d.lastX) / per / dt) * 1000; // cards per second
    d.lastX = e.clientX;
    d.lastT = e.timeStamp;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    if (d.id !== e.pointerId) return;
    d.id = -1;
    if (!d.moved) return;
    s.current.dragging = false;
    const st = s.current;
    go(st.user + clamp(d.v * 0.18, -3, 3));
  };
  const onClickCapture = (e: React.MouseEvent) => {
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = false;
    }
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      go(Math.round(s.current.user) + (e.key === "ArrowRight" ? 1 : -1));
    }
  };

  const addToBag = (p: Product) =>
    add({ id: p.id, name: p.name, price: p.price, image: p.images[0]?.src });

  return (
    <section id="fabrics" ref={root} className="relative scroll-mt-24 bg-paper">
      <div ref={pin} className="relative flex h-svh max-h-[900px] min-h-[620px] flex-col overflow-hidden pt-20 pb-10 sm:pt-24">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <SectionHeading copy={{ ...copy, subtitle: "" }} />
          <div className="max-w-xs sm:text-right">
            {copy.subtitle && <p className="text-sm text-ink-soft">{copy.subtitle}</p>}
            {n > 1 && (
              <p className="mt-2 text-[11px] font-semibold tracking-[0.28em] text-ink-soft/70 uppercase">
                Drag · ← →
              </p>
            )}
          </div>
        </div>

        {n > 0 && (
          <div
            data-card-wrap
            ref={stage}
            tabIndex={0}
            role="group"
            aria-roledescription="carousel"
            aria-label={`${copy.title} ${copy.accent}`.trim()}
            onKeyDown={onKeyDown}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onClickCapture={onClickCapture}
            onPointerEnter={() => (s.current.hover = true)}
            onPointerLeave={() => (s.current.hover = false)}
            className="relative mt-4 flex-1 cursor-grab touch-pan-y outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-pink/40 focus-visible:ring-inset"
            style={{
              perspective: "1300px",
              perspectiveOrigin: "50% 45%",
              ["--cw" as string]: "min(max(min(56vw, 230px), min(21vw, 280px)), calc((100svh - 330px) / 1.42))",
            }}
          >
            {products.map((p, i) => (
              <FabricCard
                key={p.id}
                ref={(el) => {
                  cards.current[i] = el;
                }}
                product={p}
                onAdd={() => addToBag(p)}
                onFocusCard={() => goTo(i)}
              />
            ))}
            {/* Soft floor shadow under the arc */}
            <div className="pointer-events-none absolute bottom-[4%] left-1/2 h-10 w-[60%] -translate-x-1/2 rounded-[50%] bg-ink/10 blur-2xl" />
          </div>
        )}

        {n > 1 && (
          <div className="mx-auto mt-2 flex items-center gap-1.5" aria-hidden>
            {products.map((p, i) => (
              <span
                key={p.id}
                className={`h-1 rounded-full transition-all duration-500 ${i === front ? "w-6 bg-pink" : "w-1.5 bg-ink/15"}`}
              />
            ))}
          </div>
        )}
        <p className="sr-only" aria-live="polite">
          {products[front]?.name}
        </p>
      </div>
    </section>
  );
}
