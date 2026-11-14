"use client";
// Occasions: a row of Mughal-arch frames (plain arch + pointed-dome clip variants) with a gold outline arch
// behind each. They rise in with a stagger on scroll, drift with parallax, and lift/zoom on hover.
import { useRef } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { Category, SectionCopy } from "@/lib/types";
import { SectionHeading } from "@/components/ui/SectionHeading";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const FALLBACK = "linear-gradient(165deg, #fbe4ef 0%, #f6b7d3 55%, #ee7fb2 100%)";

export function Occasions({ copy, occasions }: { copy: SectionCopy; occasions: Category[] }) {
  const root = useRef<HTMLElement>(null);
  const list = occasions.slice(0, 6);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-rise]", {
          y: 90,
          opacity: 0,
          duration: 1.1,
          ease: "expo.out",
          stagger: 0.12,
          scrollTrigger: { trigger: "[data-row]", start: "top 85%", once: true },
        });
        gsap.utils.toArray<HTMLElement>("[data-drift]").forEach((el, i) => {
          const amp = i % 2 ? 22 : -22;
          gsap.fromTo(
            el,
            { y: -amp },
            { y: amp, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 0.8 } },
          );
        });
      });
    },
    { scope: root, dependencies: [list.length] },
  );

  return (
    <section ref={root} id="occasions" className="relative scroll-mt-24 overflow-hidden px-4 py-20 sm:px-6 sm:py-28">
      {/* Pointed-dome clip shape, referenced by the odd frames */}
      <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
        <defs>
          <clipPath id="occ-dome" clipPathUnits="objectBoundingBox">
            <path d="M0,1 L0,0.24 C0,0.13 0.36,0.09 0.5,0 C0.64,0.09 1,0.13 1,0.24 L1,1 Z" />
          </clipPath>
        </defs>
      </svg>
      <div className="mx-auto max-w-7xl">
        <SectionHeading copy={copy} />
        <div
          data-row
          data-lenis-prevent-touch
          className="no-scrollbar -mx-4 mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pt-8 pb-8 sm:-mx-6 sm:px-6 lg:mx-0 lg:gap-6 lg:overflow-visible lg:px-0"
        >
          {list.map((o, i) => {
            const dome = i % 2 === 1;
            return (
              <article
                key={o.id}
                data-rise
                className="group w-[62vw] max-w-[260px] shrink-0 snap-center sm:w-[34vw] lg:w-auto lg:max-w-none lg:flex-1"
              >
                <div data-drift>
                  <div className="relative transition-transform duration-500 ease-out will-change-transform group-hover:-translate-y-3">
                    {/* thin gold outline arch behind the frame */}
                    {dome ? (
                      <svg
                        className="pointer-events-none absolute -top-3 -right-2 -left-2 h-[calc(100%+12px)] w-[calc(100%+16px)]"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M0 100 L0 24 C0 13 36 9 50 0 C64 9 100 13 100 24 L100 100 Z"
                          fill="none"
                          stroke="var(--gold)"
                          strokeWidth="1"
                          vectorEffect="non-scaling-stroke"
                        />
                      </svg>
                    ) : (
                      <div className="arch pointer-events-none absolute -top-3 -right-2 -left-2 h-[calc(100%+12px)] border border-gold/70" />
                    )}
                    <div
                      className={`relative aspect-[3/5] overflow-hidden bg-mist shadow-[0_18px_40px_-18px_rgba(58,10,34,0.45)] ${dome ? "" : "arch"}`}
                      style={{ ...(dome ? { clipPath: "url(#occ-dome)" } : {}), background: FALLBACK }}
                    >
                      {/* The pointed dome starts the photo lower so the point always sits above the head */}
                      <div className={`absolute inset-x-0 bottom-0 ${dome ? "top-[9%]" : "top-0"}`}>
                        {o.image && (
                          <Image
                            src={o.image.src}
                            alt={o.image.alt || o.name}
                            fill
                            sizes="(min-width:1024px) 16vw, (min-width:640px) 34vw, 62vw"
                            style={{
                              objectPosition: "center 12%",
                              ...(dome ? { maskImage: "linear-gradient(to bottom, transparent 0, #000 9%)", WebkitMaskImage: "linear-gradient(to bottom, transparent 0, #000 9%)" } : {}),
                            }}
                            className="origin-top object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                          />
                        )}
                      </div>
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-wine/30 via-transparent to-transparent" />
                    </div>
                  </div>
                  <div className="mt-5 px-1 text-center">
                    <h3 className="font-display text-xl leading-tight font-semibold text-ink sm:text-2xl">{o.name}</h3>
                    {o.description && <p className="mt-1 line-clamp-2 text-xs text-ink-soft sm:text-sm">{o.description}</p>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
