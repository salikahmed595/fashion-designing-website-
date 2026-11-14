// Shared domain types. Normalised from the WooCommerce Store API
// (/wp-json/wc/store/v1) so components never depend on raw WP responses.

export type ProductImage = { src: string; alt: string };

export type Category = {
  id: number;
  name: string;
  slug: string;
  description: string; // plain text
  image: ProductImage | null;
  count: number;
  parent: number;
  /** First #hex found in the WP category description (used for swatches/cards). */
  color?: string;
};

/** A piece of a "full look" (WooCommerce grouped product child). */
export type Piece = {
  id: number;
  name: string;
  price: number;
  image: ProductImage | null;
};

/** Silhouette used to draw a garment when no real hanger photo exists. */
export type GarmentKind = "kaftan" | "abaya" | "gown" | "lehenga" | "sharara" | "coord" | "jacket" | "stole";

/**
 * Product shot of the garment alone on a hanger (rail viewer).
 * `front`/`back` are real photos when the client uploads them (gallery images
 * with alt "hanger front" / "hanger back"); otherwise the UI draws `kind`
 * filled with the `fabric` texture.
 */
export type GarmentShot = {
  kind: GarmentKind;
  fabric: ProductImage | null;
  front: ProductImage | null;
  back: ProductImage | null;
};

/** A colour option. `images` = [front, back, ...] for that colour. */
export type Colorway = { name: string; hex: string; images: ProductImage[] };

export type Product = {
  id: number;
  slug: string;
  name: string;
  shortDescription: string; // plain text
  price: number; // major units (PKR)
  regularPrice: number;
  onSale: boolean;
  currency: string;
  inStock: boolean;
  images: ProductImage[];
  categories: Pick<Category, "id" | "name" | "slug">[];
  /** From the "Size" product attribute. */
  sizes: string[];
  /** Hex colours from the "Swatch" attribute; drives cards and woven ribbons. */
  swatch: string[];
  /** Grouped-product children ("Try the Look" pieces). */
  pieces: Piece[];
  /** Transparent full-length model photo (gallery image whose alt/filename contains "cutout"). */
  cutout: ProductImage | null;
  /** Colour options with their own front/back photos (empty = single colour). */
  colorways: Colorway[];
  /** Garment-only view for the rail (real hanger photos or drawn silhouette). */
  garment: GarmentShot;
};

export type SectionCopy = {
  eyebrow: string;
  title: string;
  accent: string; // rendered in brand pink after the title
  subtitle: string;
};

export type SectionKey =
  | "occasions"
  | "tryLook"
  | "fabrics"
  | "rail"
  | "devotion"
  | "drape"
  | "collection"
  | "motion"
  | "weave";

/** Editable site copy. Comes from the WP `anashion/v1/home` endpoint. */
export type HomeContent = {
  nav: { label: string; href: string }[];
  hero: {
    eyebrow: string;
    title: string;
    titleAccent: string;
    subtitle: string;
    ctaLabel: string;
    ctaHref: string;
    secondaryLabel: string;
    secondaryHref: string;
    image: string; // still shown if WebGL is unavailable
    /** Optional scroll-scrubbed video (boutique walk-through). Replaces the 3D hallway when set. */
    video: string;
    /** Two transparent model cut-outs that walk in and sit in the 3D hallway. */
    models: string[];
  };
  heritage: { eyebrow: string; title: string; body: string; image: string };
  /** Words on the wavy ribbon marquee under the hero. */
  marquee: string[];
  /** Fixed bottom ticker items. */
  ticker: { label: string; text: string }[];
  sections: Record<SectionKey, SectionCopy>;
  footer: { title: string; accent: string; note: string };
  weave: { discountPercent: number };
};

export type Catalog = {
  products: Product[];
  occasions: Category[];
  garmentTypes: Category[];
};

/**
 * Product placement categories. The client puts a product in one of these
 * WooCommerce categories to show it in that homepage section.
 */
export const PLACEMENT = {
  tryLook: "try-the-look",
  fabrics: "pick-a-fabric",
  devotion: "devotion-edit",
  drape: "feel-the-drape",
  collection: "bridal-collection",
  motion: "in-motion",
  weave: "weave",
} as const;

/** Parent categories whose children are listed as occasions / garment types. */
export const PARENT = { occasions: "occasions", garments: "garments" } as const;
