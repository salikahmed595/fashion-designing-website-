// Fixed ticker along the bottom edge of the viewport (as in the reference).
import type { HomeContent } from "@/lib/types";

export function BottomTicker({ items }: { items: HomeContent["ticker"] }) {
  const row = (hidden: boolean) => (
    <ul aria-hidden={hidden} className="flex shrink-0 items-center">
      {items.map((t, i) => (
        <li key={i} className="flex items-center gap-2 px-5 whitespace-nowrap">
          <span className="text-pink">✦</span>
          <span className="font-semibold tracking-[0.18em] text-gold-soft uppercase">{t.label}</span>
          <span className="text-white/75">{t.text}</span>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 overflow-hidden bg-wine py-1.5 text-[11px]" role="marquee" aria-label="Highlights">
      <div className="animate-marquee flex w-max" style={{ ["--marquee-duration" as string]: "55s" }}>
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
