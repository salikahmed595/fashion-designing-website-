"use client";
// In Motion: a fanned row of phone-shaped reel cards (slow Ken Burns stands in for video).
// Clicking a card opens the full-screen StoryViewer.
import { useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { Product, SectionCopy } from "@/lib/types";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProductMedia } from "./media/ProductMedia";
import { StoryViewer } from "./motion/StoryViewer";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const duration = (id: number) => `0:${String(10 + (id % 20)).padStart(2, "0")}`;

export function InMotion({ copy, products }: { copy: SectionCopy; products: Product[] }) {
  const root = useRef<HTMLElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  const n = products.length;
  const mid = (n - 1) / 2;

  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reduce) {
        gsap.to("[data-kb]", { scale: 1.14, duration: 7, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: { each: 0.6, from: "random" } });
      }
      gsap.from("[data-reel]", {
        y: 90,
        opacity: 0,
        rotateY: 18,
        duration: 1.1,
        ease: "power3.out",
        stagger: 0.09,
        scrollTrigger: { trigger: root.current, start: "top 70%", once: true },
      });
    },
    { scope: root, dependencies: [n] },
  );

  return (
    <section ref={root} id="motion" className="scroll-mt-24 overflow-x-clip py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading copy={copy} />
      </div>

      {n > 0 && (
        <div
          className="no-scrollbar mt-10 flex gap-4 overflow-x-auto px-4 pt-6 pb-10 sm:gap-6 sm:px-6 [&>*:first-child]:ml-auto [&>*:last-child]:mr-auto"
          style={{ perspective: "1600px" }}
        >
          {products.map((p, idx) => {
            const d = idx - mid;
            return (
              <div
                key={p.id}
                data-reel
                className="w-[200px] shrink-0 sm:w-[230px] lg:w-[250px]"
                style={{ transform: `translateY(${Math.min(Math.abs(d), 4) ** 2 * 5}px) rotate(${d * 2.2}deg) rotateY(${-d * 4}deg)` }}
              >
                <button
                  type="button"
                  onClick={() => setOpen(idx)}
                  aria-label={`Play reel: ${p.name}`}
                  className="group relative block aspect-[9/16] w-full overflow-hidden rounded-2xl border-[3px] border-ink bg-ink text-left shadow-[0_25px_50px_-20px_rgba(58,10,34,0.55)] transition-all duration-500 hover:-translate-y-4 hover:scale-[1.04] hover:shadow-[0_40px_70px_-20px_rgba(58,10,34,0.6)] focus-visible:-translate-y-4 focus-visible:ring-2 focus-visible:ring-pink focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  <div data-kb className="absolute inset-0">
                    <ProductMedia product={p} sizes="(min-width:1024px) 250px, (min-width:640px) 230px, 200px" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30" />
                  {/* status bar */}
                  <div className="absolute inset-x-0 top-2 flex items-center justify-between px-4" aria-hidden>
                    <span className="h-1 w-8 rounded-full bg-white/60" />
                    <span className="flex gap-1">
                      <i className="h-1 w-1 rounded-full bg-white/70" />
                      <i className="h-1 w-1 rounded-full bg-white/70" />
                      <i className="h-1 w-3 rounded-full bg-white/70" />
                    </span>
                  </div>
                  <span className="absolute top-7 left-3 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
                    <span aria-hidden>&#9654; </span>{duration(p.id)}
                  </span>
                  <span className="absolute inset-x-3 bottom-4 font-display text-lg leading-tight text-white">{p.name}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {open !== null && <StoryViewer products={products} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </section>
  );
}
