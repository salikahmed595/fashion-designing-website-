"use client";
// Shared section heading: small eyebrow, serif title with a pink accent phrase,
// optional subtitle. Words rise in on scroll.
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { SectionCopy } from "@/lib/types";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function SectionHeading({
  copy,
  align = "left",
  tone = "dark",
  className = "",
  as: Tag = "h2",
}: {
  copy: SectionCopy;
  align?: "left" | "center";
  tone?: "dark" | "light";
  className?: string;
  as?: "h1" | "h2";
}) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from("[data-word]", {
        yPercent: 110,
        opacity: 0,
        duration: 1,
        ease: "expo.out",
        stagger: 0.05,
        scrollTrigger: { trigger: root.current, start: "top 85%", once: true },
      });
      gsap.from("[data-fade]", {
        y: 16,
        opacity: 0,
        duration: 0.9,
        ease: "power2.out",
        delay: 0.25,
        scrollTrigger: { trigger: root.current, start: "top 85%", once: true },
      });
    },
    { scope: root },
  );

  const words = (s: string, accent = false) =>
    s
      .split(" ")
      .filter(Boolean)
      .map((w, i) => (
        <span key={`${accent}-${i}`} className="inline-block overflow-hidden pb-[0.12em] align-bottom">
          <span data-word className={`inline-block ${accent ? "text-pink italic" : ""}`}>
            {w}&nbsp;
          </span>
        </span>
      ));

  const muted = tone === "dark" ? "text-ink-soft" : "text-white/70";
  return (
    <div ref={root} className={`${align === "center" ? "mx-auto text-center" : ""} ${className}`}>
      {copy.eyebrow && (
        <p data-fade className={`text-[11px] font-semibold tracking-[0.32em] uppercase ${muted}`}>
          <span className="mr-2 inline-block h-px w-6 bg-pink align-middle" />
          {copy.eyebrow}
        </p>
      )}
      <Tag className={`mt-3 font-display text-4xl leading-[1] font-medium sm:text-6xl ${tone === "light" ? "text-white" : "text-ink"}`}>
        {words(copy.title)}
        {words(copy.accent, true)}
      </Tag>
      {copy.subtitle && (
        <p data-fade className={`mt-4 max-w-xl text-sm sm:text-base ${muted} ${align === "center" ? "mx-auto" : ""}`}>
          {copy.subtitle}
        </p>
      )}
    </div>
  );
}
