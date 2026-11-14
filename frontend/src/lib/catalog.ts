// Client-safe helpers for working with catalog data (no server imports).
import type { GarmentKind, Product } from "./types";

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

/** Garment silhouette from the product's garment category slug. */
const KIND_BY_SLUG: Record<string, GarmentKind> = {
  lehenga: "lehenga",
  gharara: "sharara",
  sharara: "sharara",
  "bridal-maxi": "gown",
  gown: "gown",
  peshwas: "gown",
  abaya: "abaya",
  kaftan: "kaftan",
  "co-ord-set": "coord",
  jacket: "jacket",
  stole: "stole",
  dupatta: "stole",
};
export const garmentKindOf = (slugs: string[]): GarmentKind =>
  slugs.map((s) => KIND_BY_SLUG[s]).find(Boolean) ?? "kaftan";
