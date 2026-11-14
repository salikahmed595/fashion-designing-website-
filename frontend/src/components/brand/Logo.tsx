// Anashion wordmark: magenta disc behind "AN", serif caps, script tagline.
export function Logo({
  tagline = true,
  tone = "dark",
  className = "",
}: {
  tagline?: boolean;
  tone?: "dark" | "light";
  className?: string;
}) {
  const text = tone === "dark" ? "text-ink" : "text-white";
  return (
    <span className={`inline-flex flex-col leading-none ${className}`} aria-label="Anashion, a nation of fashion">
      <span aria-hidden className={`relative font-display text-[1.6em] font-medium tracking-[0.04em] ${text}`}>
        <span className="absolute top-1/2 left-[-0.12em] -z-0 aspect-square h-[1.55em] -translate-y-1/2 rounded-full bg-pink" />
        <span className="relative text-white">AN</span>
        <span className="relative">ASHION</span>
      </span>
      {tagline && (
        <span aria-hidden className={`mt-[0.1em] ml-[1.6em] font-script text-[0.95em] ${text} opacity-90`}>
          A nation of fashion
        </span>
      )}
    </span>
  );
}
