// Data layer: WordPress + WooCommerce (headless). The ONLY module that talks to WP.
// - Products & categories: WooCommerce Store API (public, no keys needed).
// - Site copy: custom endpoint from the `anashion-headless` WP plugin.
// Cached with `use cache` + tags; WP calls /api/revalidate on edits.
import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { mockCatalog, mockHome } from "./mock";
import type {
  Catalog,
  Category,
  HomeContent,
  Piece,
  Product,
  ProductImage,
} from "./types";
import { PARENT } from "./types";

export const TAGS = { products: "products", home: "home" } as const;

const WP_URL = process.env.WP_URL?.replace(/\/$/, "");

/** Base URL for the WooCommerce checkout hand-off (null = demo mode). */
export const checkoutBase = WP_URL ?? null;

async function wpFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${WP_URL}/wp-json${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`WP ${res.status} on ${path}`);
  return (await res.json()) as T;
}

// --- Raw Store API shapes (only the fields we use) ---
type StoreImage = { src: string; alt: string } | null;
type StoreProduct = {
  id: number;
  slug: string;
  name: string;
  type: string;
  short_description: string;
  prices: {
    price: string;
    regular_price: string;
    currency_code: string;
    currency_minor_unit: number;
  };
  on_sale: boolean;
  is_in_stock: boolean;
  images: { src: string; alt: string }[];
  categories: { id: number; name: string; slug: string }[];
  attributes?: { name: string; terms: { name: string }[] }[];
  /** Present on grouped products (unverified against a live store). */
  grouped_products?: number[];
};
type StoreCategory = {
  id: number;
  name: string;
  slug: string;
  description: string;
  parent: number;
  count: number;
  image: StoreImage;
};

const stripHtml = (html: string) =>
  html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const HEX = /#(?:[0-9a-f]{3}){1,2}\b/gi;

function attr(p: StoreProduct, re: RegExp): string[] {
  return p.attributes?.find((a) => re.test(a.name))?.terms.map((t) => t.name) ?? [];
}

function toProduct(p: StoreProduct, byId: Map<number, StoreProduct>): Product {
  const div = 10 ** p.prices.currency_minor_unit;
  const money = (v: string) => Number(v) / div;
  const pieces: Piece[] = (p.grouped_products ?? [])
    .map((id) => byId.get(id))
    .filter((c): c is StoreProduct => !!c)
    .map((c) => ({
      id: c.id,
      name: stripHtml(c.name),
      price: Number(c.prices.price) / 10 ** c.prices.currency_minor_unit,
      image: c.images[0] ? { src: c.images[0].src, alt: c.images[0].alt || c.name } : null,
    }));
  const name = stripHtml(p.name);
  const all = p.images.map((i): ProductImage => ({ src: i.src, alt: i.alt || name }));
  const isCutout = (i: ProductImage) => /cutout/i.test(i.alt) || /cutout/i.test(i.src);
  const images = all.filter((i) => !isCutout(i));
  // "Colour" terms like "Rose #d4887f"; gallery is ordered front, back per colour.
  const colorways = attr(p, /^colou?r$/i).map((term, k) => ({
    name: term.replace(HEX, "").trim() || `Colour ${k + 1}`,
    hex: term.match(HEX)?.[0] ?? "#cccccc",
    images: images.slice(k * 2, k * 2 + 2),
  }));
  return {
    id: p.id,
    slug: p.slug,
    name,
    shortDescription: stripHtml(p.short_description),
    price: money(p.prices.price),
    regularPrice: money(p.prices.regular_price),
    onSale: p.on_sale,
    currency: p.prices.currency_code,
    inStock: p.is_in_stock,
    images,
    categories: p.categories,
    sizes: attr(p, /size/i),
    swatch: attr(p, /swatch|colou?r/i).flatMap((t) => t.match(HEX) ?? []),
    pieces,
    cutout: all.find(isCutout) ?? null,
    colorways: colorways.length > 1 ? colorways : [],
  };
}

function toCategory(c: StoreCategory): Category {
  const description = stripHtml(c.description);
  return {
    id: c.id,
    name: stripHtml(c.name),
    slug: c.slug,
    description: description.replace(HEX, "").trim(),
    image: c.image ? { src: c.image.src, alt: c.image.alt || c.name } : null,
    count: c.count,
    parent: c.parent,
    color: description.match(HEX)?.[0],
  };
}

export async function getCatalog(): Promise<Catalog> {
  "use cache";
  cacheTag(TAGS.products);
  cacheLife("hours");
  if (!WP_URL) return mockCatalog;

  const [raw, cats] = await Promise.all([
    wpFetch<StoreProduct[]>(`/wc/store/v1/products?per_page=100`),
    wpFetch<StoreCategory[]>(`/wc/store/v1/products/categories?per_page=100`),
  ]);
  const byId = new Map(raw.map((p) => [p.id, p]));
  const childIds = new Set(raw.flatMap((p) => p.grouped_products ?? []));
  const categories = cats.map(toCategory);
  const childrenOf = (slug: string) => {
    const parent = categories.find((c) => c.slug === slug);
    return parent ? categories.filter((c) => c.parent === parent.id) : [];
  };
  return {
    // Grouped-product children are shown as "pieces", not as products.
    products: raw.filter((p) => !childIds.has(p.id)).map((p) => toProduct(p, byId)),
    occasions: childrenOf(PARENT.occasions),
    garmentTypes: childrenOf(PARENT.garments),
  };
}

export async function getHomeContent(): Promise<HomeContent> {
  "use cache";
  cacheTag(TAGS.home);
  cacheLife("hours");
  if (!WP_URL) return mockHome;
  try {
    const data = await wpFetch<DeepPartial<HomeContent>>(`/anashion/v1/home`);
    return deepMerge(mockHome, data);
  } catch {
    return mockHome;
  }
}

// Empty WP fields fall back to defaults instead of rendering blank UI.
type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };
function deepMerge<T>(base: T, over: unknown): T {
  if (Array.isArray(base)) {
    return (Array.isArray(over) && over.length ? over : base) as T;
  }
  if (base && typeof base === "object") {
    const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    const o = (over ?? {}) as Record<string, unknown>;
    for (const k of Object.keys(out)) out[k] = deepMerge(out[k], o[k]);
    return out as T;
  }
  return (over === undefined || over === null || over === "" ? base : over) as T;
}
