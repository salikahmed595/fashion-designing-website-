"use client";
// Footer: full-width brand-pink block with rounded top corners, big serif headline, faint wordmark,
// four staggered link columns and a copyright bar (padded so the fixed ticker never covers it).
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { HomeContent } from "@/lib/types";
import { Logo } from "@/components/brand/Logo";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const SHOP = ["Lehenga", "Gharara", "Sharara", "Bridal Maxi"];
const CARE = ["Shipping", "Returns", "Size guide", "Contact"];
const link = "text-white/80 transition-colors hover:text-white focus-visible:text-white focus-visible:underline focus-visible:outline-none";

export function Footer({
  footer,
  nav,
  year,
}: {
  footer: HomeContent["footer"];
  nav: HomeContent["nav"];
  year: number;
}) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.from("[data-col]", {
        y: 40,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.12,
        scrollTrigger: { trigger: root.current, start: "top 85%", once: true },
      });
      gsap.from("[data-head]", {
        y: 50,
        opacity: 0,
        duration: 1.1,
        ease: "expo.out",
        scrollTrigger: { trigger: root.current, start: "top 90%", once: true },
      });
    },
    { scope: root },
  );

  const h = "text-[11px] font-semibold tracking-[0.3em] text-gold-soft uppercase";

  return (
    <footer ref={root} id="visit" className="scroll-mt-24 overflow-hidden rounded-t-[2.5rem] bg-pink px-4 pt-16 pb-14 text-white sm:rounded-t-[3.5rem] sm:px-6 sm:pt-24">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-start">
          <h2 data-head className="font-display text-5xl leading-[1.02] font-medium sm:text-7xl lg:text-8xl">
            <span className="block">{footer.title}</span>
            <span className="block text-gold-soft italic">{footer.accent}</span>
          </h2>
          <div aria-hidden className="pointer-events-none text-4xl opacity-25 select-none sm:text-6xl lg:text-7xl">
            <Logo tone="light" tagline={false} className="pl-[0.2em]" />
          </div>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-x-6 gap-y-10 border-t border-white/20 pt-10 lg:grid-cols-4">
          <div data-col>
            <h3 className={h}>Shop</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {SHOP.map((s) => (
                <li key={s}><a href="#rail" className={link}>{s}</a></li>
              ))}
            </ul>
          </div>
          <div data-col>
            <h3 className={h}>Explore</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {nav.map((x) => (
                <li key={x.href + x.label}><a href={x.href} className={link}>{x.label}</a></li>
              ))}
            </ul>
          </div>
          <div data-col>
            <h3 className={h}>Visit</h3>
            <p className="mt-4 max-w-[16rem] text-sm leading-relaxed text-white/80">{footer.note}</p>
            <a href="mailto:appointments@anashion.com?subject=Book%20an%20appointment" className="mt-4 inline-block rounded-full border border-white/60 px-5 py-2 text-sm font-semibold transition-colors hover:bg-white hover:text-pink focus-visible:bg-white focus-visible:text-pink focus-visible:outline-none">
              Book an appointment
            </a>
          </div>
          <div data-col>
            <h3 className={h}>Care</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {CARE.map((s) => (
                <li key={s}><a href="#" className={link}>{s}</a></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-2 border-t border-white/20 pt-6 text-xs text-white/75 sm:flex-row sm:items-center">
          <p>&copy; {year} Anashion. All rights reserved.</p>
          <p className="font-script text-2xl text-white">A nation of fashion</p>
        </div>
      </div>
    </footer>
  );
}
