// Fallback content used when WP_URL is not set (UI work without WordPress).
// Images are free Unsplash photos (Unsplash License) as PLACEHOLDERS only;
// replace with the client's own photography via WooCommerce.
import type {
  Catalog,
  Category,
  HomeContent,
  Piece,
  Product,
  ProductImage,
} from "./types";
import { PARENT, PLACEMENT } from "./types";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { garmentKindOf } from "./catalog";

const u = (id: string, w = 1400) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

/** Placeholder photo pool (Unsplash IDs). */
export const STOCK = {
  bride: [
    "1721324807083-e9ddaa99310e",
    "1600685890506-593fdf55949b",
    "1631549423660-c10874dc335f",
    "1631549424057-403e75d68e2f",
    "1707576618343-26a1b377ca7a",
    "1631549423034-ceb712f24ab2",
    "1721324807072-784ab8ddf166",
    "1736849544435-62169987e56c",
    "1634990107480-1422c742f9b5",
    "1677691257001-8bfd91e288ff",
    "1634990107998-2c56c5afa573",
    "1747847471528-7b95ea7a4c39",
    "1610047614256-023d7c028d0b",
    "1677691257363-eebd2abeafec",
    "1740674570259-a47d713a2976",
    "1746372283841-dbb3838f9935",
    "1677691257005-9d69ab23f485",
    "1707665231479-69e9fd2d4a7f",
    "1722952908681-944d47e45853",
    "1711128640065-cdac1e385dc2",
    "1759906760638-eeffcb471e53",
    "1767955694884-d4bf352c23c2",
    "1707576763859-19e8c69450ad",
    "1668371679302-a8ec781e876e",
    "1587271598589-3f91d0872f66",
    "1707665231481-f0d3e1fceb0b",
  ],
  mehndi: [
    "1619715613791-89d35b51ff81",
    "1684814070823-97e0b9e99c69",
    "1759720888181-7b56230250d0",
    "1505932794465-147d1f1b2c97",
    "1730003873829-09b4b16444c1",
  ],
  light: [
    "1729146768775-3662af38016e",
    "1601432093209-8af1fd74b054",
    "1588842867976-fd084ca2c87b",
    "1702378154233-9b870ff8f1b3",
    "1574847872646-abff244bbd87",
  ],
  fabric: [
    "1724856605022-106d6dd6e842",
    "1724856604403-60304b28906c",
    "1724856604254-f7cf4e9c8f72",
    "1583878544826-8f8c418033ed",
  ],
  interior: ["1769107805511-0bb7075fca27", "1788953324796-477844d62b4f"],
};

/** Unsplash id, or a local path such as "/lookbook/gown-front.webp". */
const img = (id: string, alt: string, w?: number): ProductImage => ({
  src: id.startsWith("/") ? id : u(id, w),
  alt,
});
/**
 * Generated placeholder images dropped into frontend/public/generated/
 * (see docs/image-prompts.md). Picked up automatically if the file exists.
 */
const GEN_EXT = [".webp", ".png", ".jpg", ".jpeg"];
function gen(base: string): string | null {
  for (const ext of GEN_EXT) {
    if (existsSync(join(process.cwd(), "public", "generated", base + ext))) return `/generated/${base}${ext}`;
  }
  return null;
}

/** Client lookbook crops (frontend/public/lookbook). */
const lb = (name: string) => `/lookbook/${name}.webp`;

export const mockHome: HomeContent = {
  nav: [
    { label: "Home", href: "#top" },
    { label: "Try the Look", href: "#try-the-look" },
    { label: "Fabrics", href: "#fabrics" },
    { label: "The Rail", href: "#rail" },
    { label: "The Drape", href: "#drape" },
    { label: "Bridal", href: "#bridal" },
    { label: "In Motion", href: "#motion" },
  ],
  hero: {
    eyebrow: "Lahore · Hand embroidered · Bridal couture",
    title: "Stitched for",
    titleAccent: "forever.",
    subtitle:
      "Anashion brings the ateliers of Lahore to your door: lehengas, ghararas and shararas in zardozi, dabka and tilla, finished by hand.",
    ctaLabel: "Try the Look",
    ctaHref: "#try-the-look",
    secondaryLabel: "Browse the Rail",
    secondaryHref: "#rail",
    image: u(STOCK.interior[1], 2000),
    video: "",
    models: [lb("cut/gown-front"), lb("cut/rose-front")],
  },
  heritage: {
    eyebrow: "The heritage",
    title: "An heirloom from the first stitch.",
    body: "Worn once, kept for generations.",
    image: u(STOCK.bride[12], 2000),
  },
  marquee: [
    "Zardozi",
    "Hand embroidered",
    "Dabka & tilla",
    "Mughal borders",
    "Bridal couture",
    "Made in Lahore",
  ],
  ticker: [
    { label: "Try the Look", text: "Six bridal looks, styled head to toe" },
    { label: "Pure zari", text: "Real metallic thread in every border" },
    { label: "The Rail", text: "Browse the full rail of lehengas, ghararas & shararas" },
    { label: "Bridal", text: "Heirloom pieces for the day that matters" },
    { label: "Made to measure", text: "Every outfit tailored to you" },
  ],
  sections: {
    occasions: {
      eyebrow: "The Anashion story",
      title: "Six occasions.",
      accent: "One wedding.",
      subtitle: "From the first dholki to the walima, a look for every evening.",
    },
    tryLook: {
      eyebrow: "Styled head to toe",
      title: "Try the",
      accent: "Look.",
      subtitle: "Six looks, styled head to toe. Tap a look to see the pieces.",
    },
    fabrics: {
      eyebrow: "The fabric room",
      title: "Pick a",
      accent: "Fabric.",
      subtitle: "Each card is a fabric we embroider on. Tap + to add it to your bag.",
    },
    rail: {
      eyebrow: "The rail",
      title: "Every piece,",
      accent: "on the rail.",
      subtitle: "Filter by silhouette. Tap a piece to take it off the rail.",
    },
    devotion: {
      eyebrow: "The edit",
      title: "Embroidered in devotion.",
      accent: "Worn in light.",
      subtitle: "Ten pieces. Ten brides. Every stitch an offering.",
    },
    drape: {
      eyebrow: "The muse",
      title: "Feel the",
      accent: "drape.",
      subtitle: "",
    },
    collection: {
      eyebrow: "For the day that matters most",
      title: "The Bridal",
      accent: "Collection.",
      subtitle: "",
    },
    motion: {
      eyebrow: "The muse reels",
      title: "Brides,",
      accent: "in motion.",
      subtitle: "Real brides, real days. Tap a reel to shop the look.",
    },
    weave: {
      eyebrow: "Build your trousseau",
      title: "Three threads,",
      accent: "one legacy.",
      subtitle: "Choose a fabric to weave it in. Any three, 10% off.",
    },
  },
  footer: {
    title: "Stitched with heritage.",
    accent: "Worn for today.",
    note: "Bridal appointments in Lahore, Karachi & Islamabad. Worldwide shipping.",
  },
  weave: { discountPercent: 10 },
};

// ----------------------------------------------------------------------------
// Catalog
// ----------------------------------------------------------------------------
let nextCatId = 100;
const cat = (
  name: string,
  parent = 0,
  extra: Partial<Category> = {},
): Category => ({
  id: nextCatId++,
  name,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
  description: "",
  image: null,
  count: 0,
  parent,
  ...extra,
});

const occasionsParent = cat("Occasions", 0, { slug: PARENT.occasions });
const garmentsParent = cat("Garments", 0, { slug: PARENT.garments });

const occasions: Category[] = [
  cat("Dholki", occasionsParent.id, { description: "Song, dance & dhol", image: img(lb("rose-front"), "Dholki look") }),
  cat("Mayun", occasionsParent.id, { description: "Haldi yellows", image: img(lb("beige-front"), "Mayun look") }),
  cat("Mehndi", occasionsParent.id, { description: "Greens & henna", image: img(lb("olive-front"), "Mehndi look") }),
  cat("Nikah", occasionsParent.id, { description: "Ivory & blush", image: img(lb("lace-front"), "Nikah look") }),
  cat("Baraat", occasionsParent.id, { description: "Classic laal jora", image: img(STOCK.bride[0], "Baraat look") }),
  cat("Walima", occasionsParent.id, { description: "Pastel & pearl", image: img(lb("mauve-front"), "Walima look") }),
];

const garmentTypes: Category[] = [
  cat("Lehenga", garmentsParent.id),
  cat("Gharara", garmentsParent.id),
  cat("Sharara", garmentsParent.id),
  cat("Bridal Maxi", garmentsParent.id),
  cat("Peshwas", garmentsParent.id),
  cat("Dupatta", garmentsParent.id),
  cat("Gown", garmentsParent.id),
  cat("Abaya", garmentsParent.id),
  cat("Kaftan", garmentsParent.id),
  cat("Co-ord Set", garmentsParent.id),
  cat("Jacket", garmentsParent.id),
  cat("Stole", garmentsParent.id),
];
const G = Object.fromEntries(garmentTypes.map((g) => [g.slug, g]));

const placement = (slug: string) => ({ id: 0, name: slug, slug });

let nextPieceId = 9000;
const piece = (name: string, price: number, imageId?: string): Piece => ({
  id: nextPieceId++,
  name,
  price,
  image: imageId ? img(imageId, name, 400) : null,
});

type Seed = {
  name: string;
  price: number;
  was?: number;
  garment: string;
  photos: string[];
  swatch: string[];
  place: string[];
  blurb: string;
  pieces?: Piece[];
  cutout?: string;
  colorways?: { name: string; hex: string; photos: string[] }[];
  /** Fabric texture for the drawn garment (defaults to a detail crop). */
  fabric?: string;
};

const seeds: Seed[] = [
  { name: "Noor-e-Jahan Lehenga", price: 485000, garment: "lehenga", photos: [STOCK.bride[0], STOCK.bride[6]], swatch: ["#b3122e", "#c9a24a", "#5e0b1c"], place: [PLACEMENT.collection, PLACEMENT.devotion, PLACEMENT.drape], blurb: "Crimson raw silk with antique zardozi borders and a four-sided kamdani dupatta.", pieces: [piece("Zardozi choli", 95000), piece("Kamdani dupatta", 120000), piece("Kundan jhumkas", 38000), piece("Matha patti", 24000), piece("Tilla khussa", 14000)] },
  { name: "Shehzadi Gharara", price: 365000, garment: "gharara", photos: [STOCK.bride[1], STOCK.bride[2]], swatch: ["#9e0f2b", "#e0b85c", "#2b0710"], place: [PLACEMENT.collection, PLACEMENT.motion, PLACEMENT.devotion], blurb: "Classic Lucknowi-cut gharara with gota kinari and a hand-knotted parandi.", pieces: [piece("Gota kurti", 82000), piece("Net dupatta", 64000), piece("Jhoomar", 29000), piece("Paranda", 6500)] },
  { name: "Gulnar Sharara", price: 298000, garment: "sharara", photos: [STOCK.bride[3], STOCK.bride[5]], swatch: ["#d4194f", "#f2c46d", "#7a1033"], place: [PLACEMENT.fabrics, PLACEMENT.motion], blurb: "Pomegranate-red sharara in tissue silk with resham phool buti.", pieces: [piece("Short kameez", 74000), piece("Organza dupatta", 52000), piece("Tikka", 18000), piece("Khussa", 12000)] },
  { name: "Mehr-un-Nisa Maxi", price: 420000, garment: "bridal-maxi", photos: [STOCK.bride[4], STOCK.bride[7]], swatch: ["#8c1236", "#d8b26a", "#f4e3c3"], place: [PLACEMENT.collection, PLACEMENT.devotion, PLACEMENT.drape], blurb: "Floor-sweeping pishwas maxi with a 12-metre flare and nakshi work.", pieces: [piece("Velvet shawl", 88000), piece("Choker set", 46000), piece("Nath", 15000)] },
  { name: "Zarqa Peshwas", price: 255000, garment: "peshwas", photos: [STOCK.bride[8], STOCK.bride[9]], swatch: ["#6b1d5e", "#c9a24a", "#e3187d"], place: [PLACEMENT.motion, PLACEMENT.fabrics], blurb: "Plum peshwas with mukesh scatter and a scalloped daaman.", pieces: [piece("Churidar", 22000), piece("Chiffon dupatta", 41000), piece("Passa", 17000)] },
  { name: "Sabz Mehndi Lehenga", price: 189000, garment: "lehenga", photos: [STOCK.mehndi[0], STOCK.mehndi[1]], swatch: ["#2f8a4c", "#f2c94c", "#e3187d"], place: [PLACEMENT.fabrics, PLACEMENT.motion, PLACEMENT.devotion], blurb: "Parrot-green mehndi lehenga with mirror work and a rani-pink dupatta.", pieces: [piece("Mirror choli", 45000), piece("Rani dupatta", 38000), piece("Phool jewellery", 9000)] },
  { name: "Mahrukh Nikah Ivory", price: 335000, garment: "bridal-maxi", photos: [STOCK.light[0], STOCK.light[1]], swatch: ["#f4ead8", "#d9b36c", "#c7a0a8"], place: [PLACEMENT.collection, PLACEMENT.fabrics, PLACEMENT.drape, PLACEMENT.weave], blurb: "Ivory organza nikah maxi with pearl and dabka vines." },
  { name: "Laal Jora Classic", price: 510000, garment: "lehenga", photos: [STOCK.bride[10], STOCK.bride[11]], swatch: ["#a10d24", "#d8a948", "#3d0612"], place: [PLACEMENT.collection, PLACEMENT.devotion, PLACEMENT.motion, PLACEMENT.weave], blurb: "The heirloom red: velvet lehenga with real tilla and a double dupatta." },
  { name: "Sitara Sharara", price: 245000, garment: "sharara", photos: [STOCK.bride[13], STOCK.bride[14]], swatch: ["#c2185b", "#f8bbd0", "#c9a24a"], place: [PLACEMENT.fabrics, PLACEMENT.devotion, PLACEMENT.weave], blurb: "Star-scattered sharara in blush tissue with sequin sitara." },
  { name: "Firoza Gharara", price: 228000, garment: "gharara", photos: [STOCK.bride[15], STOCK.bride[16]], swatch: ["#1b8a8f", "#e9c46a", "#e3187d"], place: [PLACEMENT.fabrics, PLACEMENT.motion, PLACEMENT.weave], blurb: "Turquoise gharara with contrast rani kinari for the dholki." },
  { name: "Gul-e-Rana Lehenga", price: 398000, garment: "lehenga", photos: [STOCK.bride[17], STOCK.bride[18]], swatch: ["#e3187d", "#f6c1d9", "#c9a24a"], place: [PLACEMENT.collection, PLACEMENT.fabrics, PLACEMENT.devotion, PLACEMENT.weave], blurb: "Rani-pink lehenga with resham roses and a gold tissue dupatta." },
  { name: "Shirin Walima Maxi", price: 312000, garment: "bridal-maxi", photos: [STOCK.light[2], STOCK.light[3]], swatch: ["#e8d5c4", "#b89b72", "#f3c6cf"], place: [PLACEMENT.devotion, PLACEMENT.drape, PLACEMENT.weave], blurb: "Champagne walima maxi with crystal and kora detail." },
  { name: "Haldi Mayun Set", price: 98000, garment: "sharara", photos: [STOCK.light[4], STOCK.mehndi[2]], swatch: ["#f2b705", "#f28c28", "#2f8a4c"], place: [PLACEMENT.fabrics, PLACEMENT.motion, PLACEMENT.weave], blurb: "Marigold mayun sharara with gota patti and pom-pom latkans." },
  { name: "Roshan Jamawar Peshwas", price: 276000, garment: "peshwas", photos: [STOCK.bride[19], STOCK.bride[20]], swatch: ["#7b1e1e", "#d4a64a", "#1f3b2d"], place: [PLACEMENT.collection, PLACEMENT.devotion, PLACEMENT.weave], blurb: "Jamawar peshwas woven with paisley and finished in zari." },
  { name: "Dilkash Velvet Lehenga", price: 455000, garment: "lehenga", photos: [STOCK.bride[21], STOCK.bride[22]], swatch: ["#5a0e2c", "#c9a24a", "#2b0a16"], place: [PLACEMENT.collection, PLACEMENT.motion, PLACEMENT.drape], blurb: "Wine velvet lehenga with heavy zardozi and a tissue dupatta." },
  { name: "Banarsi Kamdani Dupatta", price: 72000, garment: "dupatta", photos: [STOCK.fabric[0], STOCK.fabric[1]], swatch: ["#b3122e", "#e0b85c", "#7a0c1f"], place: [PLACEMENT.fabrics, PLACEMENT.weave], blurb: "Hand-woven Banarsi dupatta with kamdani dots." },
  { name: "Tilla Organza Dupatta", price: 54000, garment: "dupatta", photos: [STOCK.fabric[2], STOCK.fabric[3]], swatch: ["#c0392b", "#f1c40f", "#fdebd0"], place: [PLACEMENT.devotion, PLACEMENT.weave], blurb: "Sheer organza with tilla border and scalloped edges." },
  { name: "Anaya Blush Gharara", price: 268000, garment: "gharara", photos: [STOCK.bride[23], STOCK.bride[24]], swatch: ["#f2a7b8", "#c9a24a", "#e3187d"], place: [PLACEMENT.collection, PLACEMENT.drape, PLACEMENT.motion], blurb: "Blush gharara with pearl-studded gota and a net dupatta." },
  { name: "Zarnigar Nikah Lehenga", price: 342000, garment: "lehenga", photos: [STOCK.bride[25], STOCK.light[3]], swatch: ["#f0e2c8", "#c9a24a", "#e3187d"], place: [PLACEMENT.drape, PLACEMENT.devotion], blurb: "Ivory-and-gold nikah lehenga lit with dabka florals." },

  // --- Modest contemporary wear (client lookbook photography) ---
  { name: "Noor Embroidered Gown", price: 89000, garment: "gown", photos: [lb("gown-front"), lb("gown-back"), lb("gown-d1"), lb("gown-d2")], cutout: lb("cut/gown-front"), swatch: ["#141114", "#e8dcc6", "#5d5559"], place: [PLACEMENT.tryLook, PLACEMENT.devotion, PLACEMENT.drape, PLACEMENT.fabrics], blurb: "Black georgette gown with an asymmetric panel of ivory threadwork and sheer embroidered sleeves.", pieces: [piece("Embroidered gown", 89000, "/lookbook/gown-front.webp"), piece("Threadwork panel", 0, "/lookbook/gown-d1.webp"), piece("Sheer sleeve", 0, "/lookbook/gown-d2.webp")] },
  { name: "Shab Embroidered Abaya", price: 64000, garment: "abaya", photos: [lb("abaya-front"), lb("abaya-back"), lb("abaya-d1"), lb("abaya-d2")], cutout: lb("cut/abaya-front"), swatch: ["#141114", "#c9a24a", "#5a1424"], place: [PLACEMENT.tryLook, PLACEMENT.devotion, PLACEMENT.motion, PLACEMENT.fabrics], blurb: "Open black abaya with hand-embroidered gold and wine florals on the shoulder and cuffs.", pieces: [piece("Shab abaya", 64000, "/lookbook/abaya-front.webp"), piece("Shoulder embroidery", 0, "/lookbook/abaya-d1.webp"), piece("Cuff detail", 0, "/lookbook/abaya-d2.webp")] },
  { name: "Chandni Lace Kaftan", price: 48000, garment: "kaftan", photos: [lb("lace-front"), lb("lace-back"), lb("lace-d1"), lb("lace-d2"), lb("lace-d3")], cutout: lb("cut/lace-front"), swatch: ["#f3ecdf", "#141114", "#d9c9a8"], place: [PLACEMENT.tryLook, PLACEMENT.collection, PLACEMENT.drape, PLACEMENT.devotion], blurb: "Ivory chikan lace kaftan with black appliqué florals and crochet-trimmed sleeves.", pieces: [piece("Lace kaftan", 48000, "/lookbook/lace-front.webp"), piece("Keyhole collar", 0, "/lookbook/lace-d1.webp"), piece("Crochet sleeve", 0, "/lookbook/lace-d2.webp"), piece("Appliqué florals", 0, "/lookbook/lace-d3.webp")] },
  { name: "Gulbahar Embroidered Kaftan", price: 42000, garment: "kaftan", photos: [lb("mauve-front"), lb("mauve-back"), lb("mauve-d1"), lb("mauve-d2"), lb("mauve-d3")], cutout: lb("cut/mauve-front"), swatch: ["#a77a8a", "#f1e6d6", "#c88f8a"], place: [PLACEMENT.tryLook, PLACEMENT.fabrics, PLACEMENT.motion, PLACEMENT.weave], blurb: "Paisley-embroidered kaftan with a scalloped hem, in mauve or rose.", pieces: [piece("Gulbahar kaftan", 42000, "/lookbook/mauve-front.webp"), piece("Embroidered yoke", 0, "/lookbook/mauve-d1.webp"), piece("Scalloped sleeve", 0, "/lookbook/mauve-d2.webp"), piece("Border hem", 0, "/lookbook/mauve-d3.webp")], colorways: [{ name: "Mauve", hex: "#a77a8a", photos: [lb("mauve-front"), lb("mauve-back")] }, { name: "Rose", hex: "#d4887f", photos: [lb("rose-front"), lb("rose-back")] }, { name: "Ivory", hex: "#f1e9dc", photos: [lb("lace-front"), lb("lace-back")] }] },
  { name: "Saba Draped Cape Set", price: 56000, garment: "co-ord-set", photos: [lb("olive-front"), lb("olive-back"), lb("olive-d1"), lb("olive-d3")], cutout: lb("cut/olive-front"), swatch: ["#7b7a4a", "#141114", "#d8ccb4"], place: [PLACEMENT.tryLook, PLACEMENT.drape, PLACEMENT.collection, PLACEMENT.weave], blurb: "Fluid satin cape, shell and wide trousers with tonal micro-embroidery.", pieces: [piece("Draped cape", 32000, "/lookbook/olive-back.webp"), piece("Satin trousers", 14000, "/lookbook/olive-d3.webp"), piece("Embroidered cuff", 0, "/lookbook/olive-d1.webp")], colorways: [{ name: "Olive", hex: "#7b7a4a", photos: [lb("olive-front"), lb("olive-back")] }, { name: "Sand", hex: "#d8c7ac", photos: [lb("beige-front"), lb("beige-back")] }] },
  { name: "Mehr Contrast Kaftan", price: 38000, garment: "kaftan", photos: [lb("cape-front"), lb("cape-d1"), lb("cape-d2"), lb("cape-d3")], cutout: lb("cut/cape-front"), swatch: ["#efe7da", "#141114", "#c9a24a"], place: [PLACEMENT.tryLook, PLACEMENT.fabrics, PLACEMENT.devotion], blurb: "Ivory crepe kaftan with a black contrast border and a tie neck.", pieces: [piece("Contrast kaftan", 38000, "/lookbook/cape-front.webp"), piece("Tie neck", 0, "/lookbook/cape-d1.webp"), piece("Wide trousers", 9000, "/lookbook/cape-d3.webp")] },
  { name: "The Modern Abaya", fabric: lb("abaya-d2"), price: 36000, garment: "abaya", photos: [lb("col-abaya"), lb("dir-a4")], cutout: lb("cut/col-abaya"), swatch: ["#141114", "#d8c7ac", "#5d5559"], place: [PLACEMENT.motion, PLACEMENT.collection], blurb: "Minimal black abaya with tonal floral embroidery down one side." },
  { name: "Linen Co-ord Set", fabric: lb("beige-d2"), price: 24000, garment: "co-ord-set", photos: [lb("col-coord"), lb("dir-a2")], cutout: lb("cut/col-coord"), swatch: ["#cbb79c", "#efe7da", "#8a7560"], place: [PLACEMENT.fabrics, PLACEMENT.devotion], blurb: "Relaxed linen shirt and wide trousers for everyday ease." },
  { name: "The Statement Jacket", fabric: lb("abaya-d1"), price: 46000, garment: "jacket", photos: [lb("col-jacket"), lb("dir-c2")], cutout: lb("cut/col-jacket"), swatch: ["#5a1424", "#d9b36c", "#efe7da"], place: [PLACEMENT.motion, PLACEMENT.fabrics], blurb: "Wine overlay jacket with artisanal gold borders." },
  { name: "Olive Kaftan", fabric: lb("olive-d2"), price: 29000, garment: "kaftan", photos: [lb("col-kaftan"), lb("dir-a3")], cutout: lb("cut/col-kaftan"), swatch: ["#6b6a35", "#c9a24a", "#2b2a17"], place: [PLACEMENT.drape, PLACEMENT.weave], blurb: "Fluid olive kaftan with fine running-stitch lines." },
  { name: "Modest Hoodie Set", fabric: lb("beige-d2"), price: 18500, garment: "co-ord-set", photos: [lb("col-hoodie"), lb("street-4")], cutout: lb("cut/col-hoodie"), swatch: ["#6e625a", "#1f2a44", "#141114"], place: [PLACEMENT.motion], blurb: "Contemporary comfort: oversized hoodie with cargo wide-legs.", colorways: [{ name: "Taupe", hex: "#6e625a", photos: [lb("col-hoodie")] }, { name: "Navy", hex: "#1f2a44", photos: [lb("street-4")] }, { name: "Black", hex: "#141114", photos: [lb("street-1")] }] },
  { name: "Signature Stole", fabric: lb("mauve-d3"), price: 9500, garment: "stole", photos: [lb("col-stole"), lb("dir-c1")], swatch: ["#5a1f3a", "#efe7da", "#a77a8a"], place: [PLACEMENT.fabrics, PLACEMENT.weave], blurb: "Versatile printed stole that completes the look." },
  { name: "Charcoal Wrap Set", fabric: lb("gown-d2"), price: 27000, garment: "co-ord-set", photos: [lb("street-2"), lb("dir-b2")], cutout: lb("cut/street-2"), swatch: ["#5d5d5f", "#9aa0a6", "#141114"], place: [PLACEMENT.devotion], blurb: "Draped knit wrap over pleated wide trousers." },
  { name: "Cocoa Harem Set", fabric: lb("abaya-d2"), price: 25500, garment: "co-ord-set", photos: [lb("street-3"), lb("dir-b3")], cutout: lb("cut/street-3"), swatch: ["#5b3a26", "#c9a24a", "#2b1b12"], place: [PLACEMENT.motion], blurb: "Chocolate tunic and harem trousers with a wooden bead necklace." },
];

const hangerShots = (base: string, name: string) => {
  const f = gen(`rail/${base}-front`);
  const b = gen(`rail/${base}-back`);
  return { front: f ? img(f, `${name}, front`) : null, back: b ? img(b, `${name}, back`) : null };
};

const products: Product[] = seeds.map((s, i) => {
  const slug = s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const garment = G[s.garment];
  return {
    id: i + 1,
    slug,
    name: s.name,
    shortDescription: s.blurb,
    price: s.price,
    regularPrice: s.was ?? Math.round(s.price * 1.12),
    onSale: true,
    currency: "PKR",
    inStock: true,
    images: s.photos.map((p, k) => img(p, `${s.name}${k ? " detail" : ""}`)),
    categories: [
      { id: garment.id, name: garment.name, slug: garment.slug },
      ...s.place.map(placement),
    ],
    sizes: ["XS", "S", "M", "L", "XL", "Custom"],
    swatch: s.swatch,
    pieces: s.pieces ?? [],
    cutout: ((c) => (c ? img(c, `${s.name} on model`) : null))(gen(`looks/${slug}`) ?? s.cutout),
    colorways: (s.colorways ?? []).map((c) => ({
      name: c.name,
      hex: c.hex,
      images: c.photos.map((p, k) => img(p, `${s.name}, ${c.name}${k ? " back" : ""}`)),
      hanger: hangerShots(`${slug}-${c.name.toLowerCase()}`, `${s.name}, ${c.name}`),
    })),
    garment: {
      kind: garmentKindOf([garment.slug]),
      fabric: img(s.fabric ?? s.photos[2] ?? STOCK.fabric[i % STOCK.fabric.length], `${s.name} fabric`, 800),
      ...hangerShots(slug, s.name),
    },
  };
});

for (const g of garmentTypes) {
  g.count = products.filter((p) => p.categories.some((c) => c.slug === g.slug)).length;
}

export const mockCatalog: Catalog = { products, occasions, garmentTypes };
