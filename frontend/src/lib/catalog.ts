// Client-safe helpers for working with catalog data (no server imports).
import type { Product } from "./types";

export const inCategory = (products: Product[], slug: string) =>
  products.filter((p) => p.categories.some((c) => c.slug === slug));

export const formatPrice = (value: number, currency = "PKR") =>
  `${currency === "PKR" ? "Rs" : currency} ${Math.round(value).toLocaleString("en-PK")}`;

/** Deterministic fallback palette when a product has no Swatch attribute. */
const FALLBACK = [
  ["#e3187d", "#c9a24a", "#3a0a22"],
  ["#b3122e", "#e0b85c", "#5e0b1c"],
  ["#2f8a4c", "#f2c94c", "#e3187d"],
  ["#f4ead8", "#c9a24a", "#e3187d"],
];
export const swatchOf = (p: Product): string[] =>
  p.swatch.length ? p.swatch : FALLBACK[p.id % FALLBACK.length];
