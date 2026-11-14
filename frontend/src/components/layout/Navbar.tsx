"use client";
// Floating pill navbar with scroll-spy (active section highlighted), bag count
// and a "Book an Appointment" CTA. Light over the dark hero, frosted after.
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { useCart } from "@/components/cart/CartProvider";
import type { HomeContent } from "@/lib/types";

export function Navbar({ items }: { items: HomeContent["nav"] }) {
  const { count, setOpen: openBag } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const [active, setActive] = useState(items[0]?.href ?? "");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const ids = items.map((i) => i.href).filter((h) => h.startsWith("#"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(`#${e.target.id}`);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    ids.forEach((h) => {
      const el = document.querySelector(h);
      if (el) io.observe(el);
    });
    return () => {
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
    };
  }, [items]);

  const light = !scrolled && !menu;
  return (
    <header className="fixed inset-x-0 top-3 z-50 px-3 sm:top-4">
      <nav
        aria-label="Main"
        className={`mx-auto flex max-w-7xl items-center justify-between gap-3 rounded-full py-2 pr-2 pl-5 transition-all duration-500 ${
          light
            ? "bg-black/10 text-white"
            : "bg-white/95 text-ink shadow-[0_10px_40px_-15px_rgba(20,17,20,0.35)]"
        }`}
      >
        <a href="#top" className="text-[15px]" aria-label="Anashion home">
          <Logo tone={light ? "light" : "dark"} tagline={false} />
        </a>

        <ul className="hidden items-center gap-0.5 lg:flex">
          {items.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                aria-current={active === item.href ? "true" : undefined}
                className={`rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors ${
                  active === item.href ? "bg-pink text-white" : light ? "hover:bg-white/15" : "hover:bg-mist"
                }`}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => openBag(true)}
            className={`relative rounded-full p-2.5 transition ${light ? "hover:bg-white/15" : "hover:bg-mist"}`}
            aria-label={`Open bag, ${count} items`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
              <path d="M5 8h14l-1.2 12H6.2L5 8Z" />
              <path d="M9 8V6a3 3 0 0 1 6 0v2" />
            </svg>
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-pink px-1 text-[10px] font-bold text-white">
                {count}
              </span>
            )}
          </button>
          <a
            href="#visit"
            className="hidden rounded-full bg-pink px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-pink-deep sm:inline-flex"
          >
            Book an Appointment
          </a>
          <button
            type="button"
            className="rounded-full p-2.5 lg:hidden"
            aria-expanded={menu}
            aria-controls="mobile-menu"
            aria-label={menu ? "Close menu" : "Open menu"}
            onClick={() => setMenu((v) => !v)}
          >
            <span aria-hidden className="block h-0.5 w-5 bg-current" />
            <span aria-hidden className="mt-1.5 block h-0.5 w-5 bg-current" />
          </button>
        </div>
      </nav>

      {menu && (
        <ul id="mobile-menu" className="mx-auto mt-2 max-w-7xl rounded-3xl bg-white p-3 text-ink shadow-lg lg:hidden">
          {items.map((item) => (
            <li key={item.href}>
              <a href={item.href} onClick={() => setMenu(false)} className="block rounded-2xl px-4 py-3 font-medium hover:bg-mist">
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
