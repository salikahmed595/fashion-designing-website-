// Drawn garment on a hanger (SVG) for The Rail when no real hanger photo exists. One silhouette per garment kind,
// filled with the fabric photo as a pattern, then shaded (folds, edge shadow, shoulder light), trimmed and tinted.
import { useId } from "react";
import type { GarmentKind } from "@/lib/types";

type Spec = { parts: string[]; inner?: string; trims: string[]; seams: string[]; pleats: string[]; yoke?: boolean };

/** Lines fanning from the top edge to the hem, used as drape/pleat creases. */
const fan = (l0: number, r0: number, y0: number, l1: number, r1: number, y1: number, n: number) =>
  Array.from({ length: n }, (_, i) => {
    const t = (i + 0.5) / n;
    const x0 = l0 + (r0 - l0) * t;
    const x1 = l1 + (r1 - l1) * t;
    return `M${x0.toFixed(1)} ${y0} C${(x0 + (x1 - x0) * 0.2).toFixed(1)} ${y0 + (y1 - y0) * 0.4} ${(x1 - (x1 - x0) * 0.1).toFixed(1)} ${y0 + (y1 - y0) * 0.75} ${x1.toFixed(1)} ${y1}`;
  });

/** Neck piece from the right shoulder point (182,54) back to the left one (118,54). */
const NECK_BACK = "C165 64 135 64 118 54";
const NECK = {
  v: "C175 90 162 112 150 116 C138 112 125 90 118 54",
  round: "C172 82 128 82 118 54",
  low: "C172 74 156 80 150 82 C144 80 128 74 118 54",
  collar: "C170 70 160 84 150 88 C140 84 130 70 118 54",
  lapel: "C172 80 160 120 150 150 C140 120 128 80 118 54",
};

function spec(kind: GarmentKind, view: "front" | "back"): Spec {
  const f = view === "front";
  const N = (k: keyof typeof NECK) => (f ? NECK[k] : NECK_BACK);
  const neckTrim = (k: keyof typeof NECK) => `M182 54 ${N(k)}`;
  switch (kind) {
    case "kaftan":
      return {
        parts: [
          `M118 54 C95 58 70 66 52 76 C30 100 14 160 4 210 L8 236 C34 244 66 232 84 190 C80 260 70 340 62 402 Q150 416 238 402 C230 340 220 260 216 190 C234 232 266 244 292 236 L296 210 C286 160 270 100 248 76 C230 66 205 58 182 54 ${N("v")} Z`,
        ],
        trims: [neckTrim("v"), "M62 402 Q150 416 238 402", "M4 210 L8 236", "M296 210 L292 236"],
        seams: ["M52 76 C72 120 80 160 84 190", "M248 76 C228 120 220 160 216 190"],
        pleats: fan(100, 200, 120, 66, 234, 404, 7),
        yoke: !f,
      };
    case "abaya":
      return {
        parts: [
          `M118 54 C100 58 80 64 64 74 C52 120 40 220 22 330 L24 356 C46 362 70 356 80 336 L90 190 L74 418 Q150 432 226 418 L210 190 L220 336 C230 356 254 362 276 356 L278 330 C260 220 248 120 236 74 C220 64 200 58 182 54 ${N("low")} Z`,
        ],
        inner: f ? "M150 80 L126 426 L174 426 Z" : undefined,
        trims: [neckTrim("low"), "M22 330 L24 356 C46 362 70 356 80 336", "M278 330 L276 356 C254 362 230 356 220 336", "M74 418 Q150 432 226 418"],
        seams: f ? ["M150 80 L126 424", "M150 80 L174 424"] : ["M150 66 L150 424"],
        pleats: fan(96, 204, 190, 80, 220, 420, 6),
        yoke: !f,
      };
    case "gown":
      return {
        parts: [
          `M118 54 C100 58 84 66 76 80 L44 236 L40 266 L66 272 L86 252 L96 150 C100 170 108 190 110 206 C98 290 68 360 46 422 Q150 440 254 422 C232 360 202 290 190 206 C192 190 200 170 204 150 L214 252 L234 272 L260 266 L256 236 L224 80 C216 66 200 58 182 54 ${N("round")} Z`,
        ],
        trims: [neckTrim("round"), "M110 206 Q150 216 190 206", "M46 422 Q150 440 254 422", "M40 266 L66 272", "M260 266 L234 272"],
        seams: ["M96 150 C100 170 108 190 110 206", "M204 150 C200 170 192 190 190 206"],
        pleats: fan(112, 188, 212, 56, 244, 428, 11),
        yoke: !f,
      };
    case "lehenga":
      return {
        parts: [
          `M118 54 C100 58 84 64 74 74 L50 130 L72 142 L88 120 L92 172 L208 172 L212 120 L228 142 L250 130 L226 74 C216 64 200 58 182 54 ${N("round")} Z`,
          "M102 190 L198 190 L264 420 Q150 440 36 420 Z",
          f ? "M84 70 C62 140 40 250 50 346 L96 350 C90 262 100 160 118 82 Z" : "M200 70 C226 140 250 250 244 346 L200 350 C206 262 198 160 184 82 Z",
        ],
        trims: [neckTrim("round"), "M102 190 H198", "M102 204 H198", "M36 420 Q150 440 264 420", "M50 346 L96 350", "M92 172 H208"],
        seams: ["M102 190 L102 204", "M198 190 L198 204"],
        pleats: fan(106, 194, 206, 52, 250, 424, 12),
        yoke: !f,
      };
    case "sharara":
      return {
        parts: [
          "M102 246 L198 246 L270 420 L162 420 L150 318 L138 420 L30 420 Z",
          `M118 54 C100 58 84 66 74 78 L52 200 L48 232 L74 238 L90 214 L96 130 L100 258 L200 258 L204 130 L210 214 L226 238 L252 232 L248 200 L226 78 C216 66 200 58 182 54 ${N("v")} Z`,
        ],
        trims: [neckTrim("v"), "M100 258 L200 258", "M30 420 L138 420", "M162 420 L270 420", "M48 232 L74 238", "M252 232 L226 238"],
        seams: ["M150 116 L150 258", "M150 258 L150 318"],
        pleats: fan(100, 200, 262, 34, 266, 418, 9),
        yoke: !f,
      };
    case "coord":
      return {
        parts: [
          "M104 224 H196 L238 420 H156 L150 300 L144 420 H62 Z",
          `M118 54 C100 58 84 66 74 78 L40 236 L44 262 L72 266 L92 160 L96 232 L204 232 L208 160 L228 266 L256 262 L260 236 L226 78 C216 66 200 58 182 54 ${N("collar")} Z`,
        ],
        trims: [neckTrim("collar"), "M96 232 H204", "M62 420 H144", "M156 420 H238"],
        seams: f ? ["M150 88 L150 232"] : ["M150 66 L150 232"],
        pleats: fan(104, 196, 232, 66, 234, 418, 7),
        yoke: !f,
      };
    case "jacket":
      return {
        parts: [
          `M118 54 C98 58 82 66 72 78 L46 236 L44 268 L72 274 L88 250 L96 140 L96 380 Q150 392 204 380 L204 140 L212 250 L228 274 L256 268 L254 236 L228 78 C218 66 202 58 182 54 ${N("lapel")} Z`,
        ],
        inner: f ? "M150 150 L134 392 L166 392 Z" : undefined,
        trims: [neckTrim("lapel"), "M96 380 Q150 392 204 380", "M44 268 L72 274", "M256 268 L228 274"],
        seams: f ? ["M150 150 L134 388", "M150 150 L166 388"] : ["M150 66 L150 386"],
        pleats: fan(100, 200, 160, 98, 202, 380, 5),
        yoke: !f,
      };
    case "stole":
      return {
        parts: ["M68 44 L232 44 L240 398 Q150 414 60 398 Z"],
        trims: ["M60 398 Q150 414 240 398", "M68 76 H232"],
        seams: ["M68 76 H232"],
        pleats: fan(78, 222, 80, 70, 230, 400, 8),
        yoke: false,
      };
  }
}

export function GarmentArt({
  kind,
  view,
  fabric,
  base,
  tint,
  className = "",
}: {
  kind: GarmentKind;
  view: "front" | "back";
  fabric: string | null;
  base: string;
  tint?: string | null;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const s = spec(kind, view);
  const clip = `c${uid}`;
  const pat = `p${uid}`;
  const fold = `f${uid}`;
  const vert = `v${uid}`;
  const blur = `b${uid}`;
  const wood = `w${uid}`;
  const grain = `g${uid}`;
  const mirror = view === "back" ? "translate(300 0) scale(-1 1)" : undefined;

  return (
    <svg viewBox="0 0 300 430" className={className} role="img" aria-hidden="true" preserveAspectRatio="xMidYMin meet">
      <defs>
        <clipPath id={clip}>
          {s.parts.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </clipPath>
        {fabric && (
          <pattern id={pat} patternUnits="userSpaceOnUse" width="150" height="150">
            <image href={fabric} width="150" height="150" preserveAspectRatio="xMidYMid slice" />
          </pattern>
        )}
        <linearGradient id={fold} gradientUnits="userSpaceOnUse" x1="0" x2="300" y1="0" y2="0">
          {[
            [0, "#000", 0.3],
            [0.07, "#000", 0],
            [0.14, "#fff", 0.12],
            [0.22, "#000", 0.22],
            [0.3, "#000", 0],
            [0.38, "#fff", 0.1],
            [0.47, "#000", 0.26],
            [0.52, "#000", 0.3],
            [0.58, "#000", 0],
            [0.66, "#fff", 0.12],
            [0.74, "#000", 0.2],
            [0.82, "#000", 0],
            [0.9, "#fff", 0.1],
            [1, "#000", 0.3],
          ].map(([o, c, a]) => (
            <stop key={String(o)} offset={o as number} stopColor={c as string} stopOpacity={a as number} />
          ))}
        </linearGradient>
        <linearGradient id={vert} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="0" y2="430">
          <stop offset="0" stopColor="#fff" stopOpacity="0.34" />
          <stop offset="0.26" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.75" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.28" />
        </linearGradient>
        <linearGradient id={wood} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#d9ae78" />
          <stop offset="1" stopColor="#8a5a2e" />
        </linearGradient>
        <filter id={blur} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <filter id={grain} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.16 0" />
        </filter>
      </defs>

      <g clipPath={`url(#${clip})`}>
        <rect width="300" height="430" fill={base} />
        {fabric ? <rect width="300" height="430" fill={`url(#${pat})`} transform={mirror} /> : <rect width="300" height="430" filter={`url(#${grain})`} />}
        {tint && <rect width="300" height="430" fill={tint} style={{ mixBlendMode: "color" }} opacity="0.85" />}
        {tint && fabric && <rect width="300" height="430" fill={tint} style={{ mixBlendMode: "multiply" }} opacity="0.25" />}
        {s.inner && <path d={s.inner} fill="#1c1216" opacity="0.62" />}
        <rect width="300" height="430" fill={`url(#${fold})`} />
        <g stroke="#000" strokeWidth="1.2" opacity="0.14" fill="none">
          {s.pleats.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        <rect width="300" height="430" fill={`url(#${vert})`} />
        {/* inner shadow along the edges */}
        <g fill="none" stroke="#000" strokeWidth="14" opacity="0.34" filter={`url(#${blur})`}>
          {s.parts.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      </g>

      {/* outline, seams, trims */}
      <g fill="none" strokeLinejoin="round" strokeLinecap="round">
        {s.parts.map((d, i) => (
          <path key={i} d={d} stroke="rgba(0,0,0,0.3)" strokeWidth="1.2" />
        ))}
        {s.seams.map((d, i) => (
          <path key={i} d={d} stroke="rgba(0,0,0,0.28)" strokeWidth="1" strokeDasharray="3 2.5" />
        ))}
        {s.yoke && <path d="M92 94 Q150 110 208 94" stroke="rgba(0,0,0,0.3)" strokeWidth="1" strokeDasharray="3 2.5" />}
        {s.trims.map((d, i) => (
          <path key={i} d={d} stroke="#d4af5a" strokeWidth="2.6" opacity="0.95" />
        ))}
      </g>

      {/* hanger */}
      <path d="M150 34 V22 C150 6 172 4 172 16" fill="none" stroke="#b89246" strokeWidth="3.4" strokeLinecap="round" />
      <path
        d="M150 32 C120 40 80 54 50 72 Q42 79 54 81 L150 54 L246 81 Q258 79 250 72 C220 54 180 40 150 32Z"
        fill={`url(#${wood})`}
        stroke="#6b4423"
        strokeWidth="1"
      />
    </svg>
  );
}
