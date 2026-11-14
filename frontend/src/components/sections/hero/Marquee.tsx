// Wavy ribbon marquee band under the heritage panel: a wine band whose top edge
// is a drifting SVG wave (two layers), scrolling brand words separated by ✦,
// that settles into the white page with a second, softer wave.

/** Periodic quadratic wave path, 2x the viewBox width so it can drift seamlessly. */
function wavePath(width: number, height: number, period: number, amp: number, flip = false) {
  const mid = height / 2;
  const h = period / 2;
  let d = `M0 ${mid} Q${h / 2} ${mid - amp} ${h} ${mid}`;
  for (let x = h; x < width; x += h) d += ` T${x + h} ${mid}`;
  return flip ? `${d} L${width} 0 L0 0 Z` : `${d} L${width} ${height} L0 ${height} Z`;
}

const W = 2880; // two 1440 periods-worth of wave so translateX(-50%) loops
const TOP_BACK = wavePath(W, 80, 480, 26);
const TOP_FRONT = wavePath(W, 80, 720, 30);
const BOTTOM = wavePath(W, 60, 960, 18, true);

export function Marquee({ words }: { words: string[] }) {
  const list = words.filter(Boolean);
  if (!list.length) return null;
  // Repeat enough to overfill wide screens, then double for the -50% loop.
  const base = Array.from({ length: Math.max(1, Math.ceil(10 / list.length)) }, () => list).flat();
  const track = [...base, ...base];

  return (
    <div className="relative z-10 -mt-14 overflow-hidden sm:-mt-20" aria-label={list.join(", ")} role="marquee">
      {/* Top wave: a pink layer drifting behind the wine front layer. */}
      <div className="relative h-12 sm:h-20" aria-hidden>
        <svg
          viewBox={`0 0 ${W} 80`}
          preserveAspectRatio="none"
          className="animate-marquee absolute inset-y-0 left-0 h-full w-[400%] sm:w-[200%]"
          style={{ ["--marquee-duration" as string]: "26s" }}
        >
          <path d={TOP_BACK} className="fill-pink-deep" transform="translate(0 -10)" />
        </svg>
        <svg
          viewBox={`0 0 ${W} 80`}
          preserveAspectRatio="none"
          className="animate-marquee absolute inset-y-0 left-0 h-full w-[400%] [animation-direction:reverse] sm:w-[200%]"
          style={{ ["--marquee-duration" as string]: "38s" }}
        >
          <path d={TOP_FRONT} className="fill-wine" />
        </svg>
      </div>

      <div className="-mt-px bg-wine py-4 sm:py-6">
        <div
          className="animate-marquee flex w-max items-center whitespace-nowrap"
          style={{ ["--marquee-duration" as string]: "48s" }}
          aria-hidden
        >
          {track.map((w, i) => (
            <span key={i} className="flex items-center">
              <span className="font-display text-lg font-medium tracking-[0.38em] text-gold-soft uppercase sm:text-2xl">
                {w}
              </span>
              <span className="mx-6 text-sm text-pink sm:mx-10 sm:text-base">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* Soft wave into the white page. */}
      <div className="relative -mt-px h-8 bg-paper sm:h-12" aria-hidden>
        <svg
          viewBox={`0 0 ${W} 60`}
          preserveAspectRatio="none"
          className="animate-marquee absolute inset-y-0 left-0 h-full w-[400%] sm:w-[200%]"
          style={{ ["--marquee-duration" as string]: "60s" }}
        >
          <path d={BOTTOM} className="fill-wine" />
        </svg>
      </div>
    </div>
  );
}
