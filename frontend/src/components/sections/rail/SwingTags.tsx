"use client";
// Colour options as physical swing tags hanging from the rail on thin strings; they sway gently, the active one
// sits forward. Clicking a tag picks that colour.
import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

export type Tag = { name: string; hex: string };

const isLight = (hex: string) => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h.slice(0, 6), 16);
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 165;
};

export function SwingTags({ tags, active, onPick, className = "" }: { tags: Tag[]; active: number; onPick: (i: number) => void; className?: string }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-tag]", { y: -90, opacity: 0, duration: 0.9, ease: "power3.out", stagger: 0.1 });
        gsap.utils.toArray<HTMLElement>("[data-tag]").forEach((el, i) => {
          gsap.fromTo(el, { rotation: -3 - (i % 2) }, { rotation: 3 + (i % 3), duration: 2.2 + i * 0.35, ease: "sine.inOut", yoyo: true, repeat: -1, transformOrigin: "50% 0", delay: i * 0.2 });
        });
      });
    },
    { scope: root, dependencies: [tags.length] },
  );

  return (
    <div ref={root} className={`flex items-start gap-3 ${className}`} role="group" aria-label="Colour">
      {tags.map((t, i) => {
        const on = i === active;
        return (
          <button
            key={`${t.name}${i}`}
            data-tag
            onClick={() => onPick(i)}
            aria-pressed={on}
            aria-label={t.name}
            style={{ transformOrigin: "50% 0" }}
            className="group flex flex-col items-center focus-visible:outline-none"
          >
            <span className="h-9 w-px bg-ink/40" />
            <span
              className={`relative flex h-[116px] w-9 items-center justify-center rounded-[5px] border border-black/15 pt-3 text-[10px] font-bold tracking-[0.22em] uppercase transition-all duration-300 group-focus-visible:ring-2 group-focus-visible:ring-pink ${
                on ? "translate-y-2 scale-110 shadow-[0_14px_16px_-6px_rgba(0,0,0,0.45)]" : "opacity-85 shadow-[0_4px_6px_-3px_rgba(0,0,0,0.3)] group-hover:translate-y-1"
              }`}
              style={{ background: t.hex, color: isLight(t.hex) ? "#1a1216" : "#fff", writingMode: "vertical-rl", transform: undefined }}
            >
              <span className="absolute top-1.5 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-white/90 shadow-inner ring-1 ring-black/20" style={{ writingMode: "horizontal-tb" }} />
              <span className="rotate-180">{t.name}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
