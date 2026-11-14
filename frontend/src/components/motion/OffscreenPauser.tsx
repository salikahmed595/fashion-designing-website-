"use client";
// Performance: marks off-screen sections with data-offscreen (and the page with
// data-hidden when the tab is hidden); globals.css pauses their CSS animations.
// Rendered inside the page so it only runs after the sections have hydrated.
import { useEffect } from "react";

export function OffscreenPauser() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) e.target.toggleAttribute("data-offscreen", !e.isIntersecting);
      },
      { rootMargin: "200px 0px" },
    );
    document.querySelectorAll("main section, footer").forEach((el) => io.observe(el));
    const onVis = () => document.documentElement.toggleAttribute("data-hidden", document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
  return null;
}
