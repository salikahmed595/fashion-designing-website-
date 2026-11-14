"use client";
// Slide-in bag + global toast.
import Image from "next/image";
import { useEffect } from "react";
import { formatPrice } from "@/lib/catalog";
import { useCart } from "./CartProvider";

export function CartDrawer() {
  const { items, open, setOpen, subtotal, setQty, remove, checkoutUrl, toast } = useCart();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return (
    <>
      {/* Toast */}
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-none fixed top-20 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-ink px-5 py-2.5 text-sm text-white shadow-xl transition-all duration-500 ${
          toast ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"
        }`}
      >
        {toast}
      </div>

      <div
        className={`fixed inset-0 z-[60] bg-ink/40 backdrop-blur-sm transition-opacity duration-500 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <aside
        aria-label="Your bag"
        aria-hidden={!open}
        inert={!open}
        data-lenis-prevent
        className={`fixed top-0 right-0 z-[61] flex h-full w-full max-w-md flex-col bg-paper shadow-2xl transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-ink/10 px-6 py-5">
          <h2 className="font-display text-3xl">
            Your <span className="text-pink italic">bag</span>
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full p-2 text-2xl leading-none hover:bg-mist"
            aria-label="Close bag"
          >
            ×
          </button>
        </header>

        <ul className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {items.length === 0 && (
            <li className="pt-10 text-center text-ink-soft">
              Your bag is empty. Something beautiful is waiting on the rail.
            </li>
          )}
          {items.map((it) => (
            <li key={it.key} className="flex gap-4">
              <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-mist">
                {it.image && <Image src={it.image} alt="" fill sizes="80px" className="object-cover" />}
              </div>
              <div className="flex flex-1 flex-col">
                <p className="font-display text-lg leading-tight">{it.name}</p>
                {it.size && <p className="text-xs text-ink-soft">Size {it.size}</p>}
                <p className="mt-1 text-sm">{formatPrice(it.price)}</p>
                <div className="mt-auto flex items-center gap-3 text-sm">
                  <div className="flex items-center rounded-full border border-ink/15">
                    <button type="button" className="px-3 py-1" onClick={() => setQty(it.key, it.qty - 1)} aria-label={`Decrease ${it.name}`}>−</button>
                    <span className="w-6 text-center">{it.qty}</span>
                    <button type="button" className="px-3 py-1" onClick={() => setQty(it.key, it.qty + 1)} aria-label={`Increase ${it.name}`}>+</button>
                  </div>
                  <button type="button" className="text-ink-soft underline-offset-4 hover:underline" onClick={() => remove(it.key)}>
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <footer className="border-t border-ink/10 px-6 py-5">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span className="font-semibold">{formatPrice(subtotal)}</span>
          </div>
          <p className="mt-1 text-xs text-ink-soft">Shipping and tailoring calculated at checkout.</p>
          {checkoutUrl ? (
            <a href={checkoutUrl} className="mt-4 block rounded-full bg-pink py-3.5 text-center font-semibold text-white transition hover:bg-pink-deep">
              Checkout
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="mt-4 block w-full cursor-not-allowed rounded-full bg-pink/40 py-3.5 text-center font-semibold text-white"
              title={items.length ? "Connect WordPress (WP_URL) to enable checkout" : "Your bag is empty"}
            >
              Checkout
            </button>
          )}
        </footer>
      </aside>
    </>
  );
}
