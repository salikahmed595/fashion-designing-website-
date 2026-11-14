"use client";
// CSS silk curtain: two crimson halves with pleat shading and a gold zari band
// down their inner edges. The hero timeline scales each half toward its outer
// edge (so the pleats bunch up) and then slides it off. Shown until the WebGL
// curtain is ready, and as the full curtain when WebGL is unavailable.
const PLEATS = [
  "radial-gradient(120% 60% at 50% 0%, rgba(255,120,190,0.28), transparent 60%)",
  "repeating-linear-gradient(90deg, rgba(58,10,34,0) 0px, rgba(58,10,34,0.42) 26px, rgba(255,140,200,0.12) 40px, rgba(58,10,34,0) 54px)",
  "linear-gradient(180deg, #3a0a22 0%, #b50e62 45%, #8f0b4d 100%)",
].join(", ");

const ZARI =
  "repeating-linear-gradient(0deg, #d9b25c 0 3px, transparent 3px 12px), linear-gradient(90deg, #a07a2c, #e9cf8a 50%, #a07a2c)";

function Half({ side }: { side: "l" | "r" }) {
  const left = side === "l";
  return (
    <div
      data-css-half={side}
      className={`absolute inset-y-0 w-[51%] will-change-transform ${left ? "left-0 origin-left" : "right-0 origin-right"}`}
      style={{ background: PLEATS, boxShadow: "0 0 40px rgba(0,0,0,0.45)" }}
    >
      <div
        className={`absolute inset-y-0 w-5 sm:w-7 ${left ? "right-0" : "left-0"}`}
        style={{ background: ZARI, opacity: 0.9 }}
      />
      <div className="absolute inset-x-0 bottom-[5%] h-8 border-y-2 border-[#d9b25c] bg-[repeating-linear-gradient(45deg,#d9b25c_0_3px,transparent_3px_14px)] opacity-80" />
    </div>
  );
}

export function CssCurtain({ hidden }: { hidden: boolean }) {
  return (
    <div
      data-css-curtain
      aria-hidden
      className={`pointer-events-none absolute inset-0 z-10 transition-opacity duration-700 ${hidden ? "opacity-0 delay-500" : "opacity-100"}`}
    >
      <Half side="l" />
      <Half side="r" />
    </div>
  );
}
