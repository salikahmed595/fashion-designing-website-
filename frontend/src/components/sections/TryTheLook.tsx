"use client";
// Try the Look: a fashion lineup of transparent full-length model cut-outs on a clean stage. One piece of state
// (selected index) drives everything: GSAP moves the chosen model to centre and scales it up while the others
// blur, fade and spread to the sides (still visible). Numbered hotspots sit on the focused model and link to the
// piece rows in the right-hand panel, which also adds the full look to the bag.
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { Product, SectionCopy } from "@/lib/types";
import { formatPrice } from "@/lib/catalog";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useCart } from "@/components/cart/CartProvider";
import { Hotspots, ModelVisual, lookRows } from "./try/parts";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const DEFAULT_ASPECT = 0.4; // width / height of a cut-out until its real size is known
const TOP = 38; // headroom for the focused (scaled-up) model and the labels
const FLOOR = 14; // px reserved under the models for the floor shadow

export function TryTheLook({ copy, products }: { copy: SectionCopy; products: Product[] }) {
  const { add } = useCart();
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const models = useRef<(HTMLDivElement | null)[]>([]);
  const prevSel = useRef<number | null | undefined>(undefined);
  const [selected, setSelected] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [added, setAdded] = useState(false);
  const [aspects, setAspects] = useState<Record<number, number>>({});

  const looks = products.slice(0, 6);
  const n = looks.length;
  const active = selected ?? 0;
  const look = looks[active];
  const rows = look ? lookRows(look) : [];
  const aspectKey = JSON.stringify(aspects);

  const setAspect = useCallback((i: number, r: number) => {
    setAspects((a) => (Math.abs((a[i] ?? 0) - r) < 0.001 ? a : { ...a, [i]: r }));
  }, []);

  // Compute every model's target from (selected index, stage width) and tween there from wherever it is now.
  const layout = useCallback(
    (sel: number | null, animate: boolean) => {
      const st = stage.current;
      if (!st || !n) return;
      const W = st.clientWidth;
      if (!W) return; // stage hidden (mobile)
      const els = models.current;
      const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const dur = animate && !reduce ? 0.9 : 0;
      const widths = els.map((e) => e?.offsetWidth ?? 0);
      const avg = widths.reduce((a, b) => a + b, 0) / n || 160;
      const margin = avg * 0.55;
      const depth = (i: number) => i % 3;

      const centers: number[] = [];
      if (sel === null) {
        looks.forEach((_, i) => centers.push(n === 1 ? W / 2 : margin + (i * (W - 2 * margin)) / (n - 1)));
      } else {
        const selW = (widths[sel] || avg) * 1.06;
        const lo = margin * 0.8;
        const spread = (idx: number[], from: number, to: number) =>
          idx.forEach((i, k) => (centers[i] = from + ((k + 0.5) / idx.length) * (to - from)));
        const left = looks.map((_, i) => i).filter((i) => i < sel);
        const right = looks.map((_, i) => i).filter((i) => i > sel);
        centers[sel] = W / 2;
        spread(left, lo, W / 2 - selW * 0.62);
        spread(right, W / 2 + selW * 0.62, W - lo);
      }

      els.forEach((el, i) => {
        if (!el) return;
        const d = depth(i);
        const w = widths[i] || avg;
        const x = centers[i] - w / 2;
        let to: gsap.TweenVars;
        if (sel === null) {
          to = { x, y: -d * 12, scale: 1 - d * 0.07, opacity: 1, filter: "blur(0px)", zIndex: 10 - d };
        } else if (i === sel) {
          to = { x, y: 0, scale: 1.06, opacity: 1, filter: "blur(0px)", zIndex: 50 };
        } else {
          to = { x, y: -d * 8, scale: 0.8, opacity: 0.35, filter: "blur(6px)", zIndex: 10 - d };
        }
        gsap.to(el, { ...to, duration: dur, ease: "power3.inOut", overwrite: "auto" });
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [n],
  );

  // Focus / unfocus: any state to any state. First run snaps into place (no animation).
  useGSAP(
    () => {
      const first = prevSel.current === undefined;
      layout(selected, !first);
      prevSel.current = selected;
      if (selected !== null) {
        gsap.fromTo(
          "[data-hotspot]",
          { scale: 0, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(2.4)", stagger: 0.09, delay: 0.55, clearProps: "transform,opacity" },
        );
      }
    },
    { scope: root, dependencies: [selected, n] },
  );

  // Cut-out sizes changed (images loaded) or the stage resized: re-place without animating.
  useEffect(() => {
    layout(selected, false);
    const st = stage.current;
    if (!st || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => layout(selected, false));
    ro.observe(st);
    return () => ro.disconnect();
  }, [layout, selected, aspectKey]);

  // Entrance on scroll (inner wrappers only, so it never fights the positioning tweens).
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-enter]", {
          y: 80,
          opacity: 0,
          duration: 1.1,
          ease: "expo.out",
          stagger: 0.09,
          scrollTrigger: { trigger: root.current, start: "top 70%", once: true },
        });
      });
    },
    { scope: root, dependencies: [n] },
  );

  // Panel crossfade whenever the look changes.
  useGSAP(
    () => {
      gsap.fromTo("[data-panel-anim]", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out", stagger: 0.05, clearProps: "transform" });
    },
    { scope: root, dependencies: [active] },
  );

  // Escape returns to the lineup.
  useEffect(() => {
    if (selected === null) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && (setHover(null), setSelected(null));
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [selected]);

  const addLook = () => {
    if (!look) return;
    add(
      [
        { id: look.id, name: look.name, price: look.price, image: look.images[0]?.src },
        ...rows.filter((r) => r.price > 0 && r.id !== look.id).map((r) => ({ id: r.id, name: r.name, price: r.price, image: r.image?.src })),
      ],
      { message: `${look.name}: full look added to your bag` },
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  };

  const pick = (i: number) => {
    setHover(null);
    setSelected(i);
  };
  const back = () => {
    setHover(null);
    setSelected(null);
  };
  const onKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(i);
    }
  };

  return (
    <section ref={root} id="try-the-look" className="relative scroll-mt-24 overflow-hidden px-4 py-12 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-7xl">
        <SectionHeading copy={copy} />

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
          <div className="min-w-0">
            {/* Desktop stage */}
            <div
              ref={stage}
              data-enter
              className="relative hidden h-[clamp(420px,62vh,640px)] rounded-[2rem] border border-ink/5 bg-gradient-to-b from-white via-white to-mist/70 shadow-[0_30px_60px_-40px_rgba(58,10,34,0.35)] lg:block"
            >
              {looks.map((p, i) => {
                const isSel = selected === i;
                return (
                  <div
                    key={p.id}
                    ref={(el) => {
                      models.current[i] = el;
                    }}
                    className="absolute top-0 left-0"
                    style={{
                      height: `calc(100% - ${FLOOR + TOP}px)`,
                      aspectRatio: String(aspects[i] ?? DEFAULT_ASPECT),
                      marginTop: TOP,
                      transformOrigin: "50% 100%",
                      willChange: "transform, filter, opacity",
                    }}
                  >
                    {/* soft floor shadow */}
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -bottom-1 left-1/2 h-3 w-[110%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(58,10,34,0.28),transparent)]"
                    />
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label={`View look: ${p.name}`}
                      aria-pressed={isSel}
                      onClick={() => pick(i)}
                      onKeyDown={(e) => onKey(e, i)}
                      className="absolute inset-0 cursor-pointer rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-pink"
                    >
                      <ModelVisual product={p} sizes="(min-width:1024px) 20vw, 50vw" onAspect={(r) => setAspect(i, r)} />
                    </div>
                    {isSel && (
                      <div className="pointer-events-none absolute inset-0 [&_button]:pointer-events-auto">
                        <Hotspots rows={rows} hover={hover} setHover={setHover} />
                      </div>
                    )}
                  </div>
                );
              })}

              {selected !== null && look && (
                <>
                  <p className="absolute top-4 left-4 z-[60] rounded-full bg-white/90 px-4 py-1.5 text-xs font-semibold tracking-wide text-ink shadow-sm ring-1 ring-ink/5">
                    {look.name}
                  </p>
                  <button
                    type="button"
                    onClick={back}
                    className="absolute top-4 right-4 z-[60] rounded-full border border-ink/15 bg-white/90 px-4 py-1.5 text-xs font-semibold text-ink transition hover:border-pink hover:text-pink focus-visible:ring-2 focus-visible:ring-pink focus-visible:outline-none"
                  >
                    ← All looks
                  </button>
                </>
              )}
            </div>

            {/* Mobile snap row */}
            <div
              data-lenis-prevent-touch
              className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pt-2 pb-3 sm:-mx-6 sm:px-6 lg:hidden"
            >
              {looks.map((p, i) => {
                const isSel = active === i && selected !== null;
                return (
                  <button
                    type="button"
                    key={p.id}
                    aria-label={`View look: ${p.name}`}
                    aria-pressed={isSel}
                    onClick={() => pick(i)}
                    className={`relative h-[46vh] min-h-[300px] shrink-0 snap-center rounded-2xl outline-none transition duration-500 focus-visible:ring-2 focus-visible:ring-pink ${
                      isSel ? "scale-[1.04] bg-pink-soft/50 ring-2 ring-pink" : selected !== null ? "opacity-60" : ""
                    }`}
                    style={{ aspectRatio: String(aspects[i] ?? DEFAULT_ASPECT) }}
                  >
                    <ModelVisual product={p} sizes="40vw" onAspect={(r) => setAspect(i, r)} />
                    <span className="absolute inset-x-0 -bottom-1 h-2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(58,10,34,0.25),transparent)]" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right panel: always visible */}
          <aside
            data-enter
            className="flex min-h-0 flex-col rounded-3xl border border-ink/10 bg-white p-5 shadow-[0_20px_50px_-30px_rgba(58,10,34,0.4)] lg:h-[clamp(420px,62vh,640px)]"
          >
            {look ? (
              <>
                <div data-panel-anim>
                  <p className="text-[11px] font-semibold tracking-[0.28em] text-ink-soft uppercase">The look</p>
                  <div className="mt-1 flex items-baseline justify-between gap-3">
                    <h3 className="font-display text-2xl leading-tight font-semibold text-ink">{look.name}</h3>
                    <span className="shrink-0 text-sm font-semibold text-ink">{formatPrice(look.price)}</span>
                  </div>
                </div>
                <ul className="no-scrollbar mt-3 min-h-0 flex-1 divide-y divide-ink/8 overflow-y-auto" data-lenis-prevent>
                  {rows.map((r, i) => (
                    <li
                      key={`${look.id}-${r.id}-${i}`}
                      data-panel-anim
                      onMouseEnter={() => setHover(i)}
                      onMouseLeave={() => setHover(null)}
                      className={`flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors ${hover === i ? "bg-pink-soft/70" : ""}`}
                    >
                      <span
                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold transition-colors ${
                          hover === i ? "bg-pink text-white" : "bg-ink text-white"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-mist">
                        {r.image && <Image src={r.image.src} alt={r.name} fill sizes="56px" className="object-cover object-top" />}
                      </span>
                      <span className="min-w-0 flex-1 text-sm leading-snug font-medium text-ink">{r.name}</span>
                      {r.price > 0 ? (
                        <span className="shrink-0 text-sm text-ink">{formatPrice(r.price)}</span>
                      ) : (
                        <span className="shrink-0 text-xs text-ink-soft">Included</span>
                      )}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={addLook}
                  className="mt-4 w-full rounded-full bg-pink px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-pink-deep focus-visible:ring-2 focus-visible:ring-pink focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  {added ? "Full look added ✓" : "Add full look to bag"}
                </button>
              </>
            ) : (
              <p className="text-sm text-ink-soft">Looks are coming soon.</p>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}
