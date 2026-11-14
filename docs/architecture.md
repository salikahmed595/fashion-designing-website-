# Architecture

```
 Client (WP admin)                     Shoppers
       │ edits products/content           │
       ▼                                  ▼
 WordPress + WooCommerce  ──JSON──▶  Next.js storefront (frontend/)
  + anashion-headless plugin           Server Components fetch + 'use cache'
       │                                  ▲
       └── POST /api/revalidate {tags} ───┘  (instant refresh)
```

## Repo layout
| Path | Purpose |
|------|---------|
| `frontend/` | Next.js 16 (App Router, TS, Tailwind v4, Cache Components) |
| `frontend/src/lib/wp.ts` | **Only** place that talks to WordPress. Normalises Store API data into `lib/types.ts` shapes. Uses mock data when `WP_URL` is empty. |
| `frontend/src/lib/mock.ts` | Mock products and homepage copy for UI work without WP |
| `frontend/src/app/api/revalidate/route.ts` | Webhook from WP. Checks the secret and revalidates the `products` or `home` tags. |
| `frontend/src/components/sections/*` | One component per homepage section, in page order: Hero (silk curtain → boutique, heritage, ribbon marquee) · Occasions · TryTheLook · PickAFabric · TheRail · DevotionStrip · FeelTheDrape · BridalCollection · InMotion (+ `motion/StoryViewer`) · Weave · Footer. Helpers in sub-folders (`try/`, `rail/`, `fabrics/`, `hero/`, `media/ProductMedia`). |
| `frontend/src/components/cart/*` | `CartProvider` (bag in localStorage, toast, checkout URL) + `CartDrawer` |
| `frontend/src/components/layout/*` | `Navbar` (scroll-spy, bag count), `BottomTicker` (fixed marquee) |
| `frontend/src/components/brand/Logo.tsx` | Anashion wordmark |
| `frontend/src/components/ui/SectionHeading.tsx` | Shared eyebrow + title + pink accent heading with reveal |
| `frontend/src/lib/catalog.ts` | Client-safe helpers: `inCategory`, `formatPrice`, `swatchOf` |
| `frontend/src/components/three/*` | R3F scenes, client-only via `dynamic(..., { ssr: false })`: `SilkCloth` (two-half centre curtain), `BoutiqueScene`/`BoutiqueHall`/`BoutiqueModel` (+ `boutiqueLayout.ts` beats, `boutiqueTextures.ts`) for the hero hallway, `WeaveRibbons`, `WebGLBoundary` |
| `frontend/public/lookbook/` | Client lookbook crops (`*-front/back/d1..3`, `col-*`, `street-*`, `dir-*`) and transparent cut-outs in `cut/` |
| `frontend/src/components/motion/SmoothScroll.tsx` | Lenis driven by the GSAP ticker so ScrollTrigger stays in sync |
| `wordpress/anashion-headless/` | WP plugin: editable content, REST endpoint, revalidation hooks |

## Data contracts
- Products: `GET {WP_URL}/wp-json/wc/store/v1/products?per_page=&category=`. Public, no API keys. Prices come in minor units and are converted in `toProduct()`.
- Categories: `GET {WP_URL}/wp-json/wc/store/v1/products/categories`. Children of `occasions` and `garments` become the occasion arches and rail filters; a `#hex` in a category description becomes its colour.
- Placement: a product appears in a section when it is in that section's category (`PLACEMENT` in `lib/types.ts`).
- Product images in WP: gallery order = front, back, details. An image whose alt or filename contains "cutout" becomes `Product.cutout` (transparent full-length model). The "Colour" attribute terms "Name #hex" become `colorways`, consuming gallery images two per colour (front, back). **(unverified against a live store)**
- Hero: the 3D hallway ends at a wardrobe filled with the products' transparent hanger shots (rail data); `hero.video` (MP4) replaces the hallway and is scrubbed by scroll. Encode with frequent keyframes (`-g 1`) for smooth scrubbing.
- Home: `GET {WP_URL}/wp-json/anashion/v1/home` → full `HomeContent` (all section copy, hero/heritage images, marquee, ticker, footer, weave discount). Deep-merged over `mockHome`, so empty fields keep defaults.
- Checkout: bag → `{WP_URL}/?anashion_cart=ID:QTY[:SIZE],…` → plugin fills the WC cart → WooCommerce checkout.
- Cache tags: `products` and `home`. These must match between `lib/wp.ts` `TAGS` and the plugin.

## Conventions
- Next.js 16 differs from older versions. Read `frontend/node_modules/next/dist/docs/` before using a new API (see `frontend/AGENTS.md`).
- `revalidateTag(tag, profile)` takes two arguments. The webhook uses `{ expire: 0 }`.
- Heavy WebGL must respect `prefers-reduced-motion` and fade in once ready.
- Animations: GSAP via `useGSAP({ scope })` so they're cleaned up automatically.

## Known gaps
- Weave bundle discount is applied in the bag only; WooCommerce checkout charges full price until a matching WC discount rule or coupon is added in the plugin.
- No product detail or category pages yet (products are bought from the homepage sections).
- "Try the Look" pieces from WC grouped products: the Store API field name is unverified.
