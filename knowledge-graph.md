# Knowledge Graph — Project Knowledge & State

Last updated: 2026-11-14

Legend: ✅ verified · 🟡 proposed/unverified · ❓ open question

## Current state
- ✅ Local folder tracks `origin/main` of https://github.com/salikahmed595/fashion-designing-website- (remote had only `README.md`).
- ✅ **Full homepage built** (all 10 reference sections plus footer, bag and fixed ticker) in the Anashion brand theme, running on mock data with Unsplash placeholder photos.
- ✅ `wordpress/anashion-headless/` plugin v0.2: all homepage copy and images editable, REST `anashion/v1/home`, bag→checkout hand-off, revalidation hooks. Passes `php -l`. **Not yet run inside a real WordPress install.**
- ✅ Pushed to `origin/main` (commit e59e5f0, 2026-11-14) after the owner was granted collaborator access.

## Goals & requirements
- ✅ Brand: **Anashion**, "A nation of fashion". Scope (owner decision, round 2): **bridal + modest contemporary wear**. Bridal: lehenga, gharara, sharara, maxi, peshwas. Modest: abaya, kaftan, gown, co-ord, jacket, stole. Client lookbooks are labelled "Modest Contemporary Wear".
- ✅ Full e-commerce. The client must easily add and edit products, inventory, images and any site content from the backend. → Headless **WordPress + WooCommerce**.
- ✅ Modern, interactive, 3D-animated UI modelled on the reference reel. See [docs/reference-video.md](docs/reference-video.md).
- ✅ Images: the **client's lookbook** images are cropped into `frontend/public/lookbook/` (71 crops, ~3 MB): `*-front`/`*-back`/`*-d1..3` details, `col-*`, `street-*` and `dir-*`, plus 16 background-removed cut-outs in `lookbook/cut/` (OpenCV GrabCut). Bridal products still use hotlinked Unsplash placeholders (`STOCK` in `lib/mock.ts`).
- Asset pipeline (not in the repo): crop and GrabCut Python scripts were run from a scratch venv. To redo: crop panels by fractional boxes, then GrabCut with a rect inset, keep the largest component, feather, and save as WebP with alpha.
- ✅ Two developers (owner and friend) share the repo.

## Architecture
- See [docs/architecture.md](docs/architecture.md). Summary: WP/Woo (content and commerce) → Store API and `anashion/v1/home` → `frontend/src/lib/wp.ts` (`'use cache'` + tags) → section components. WP save → `POST /api/revalidate` → fresh content.

## Brand (from client logo, 2026-11-14)
- Wordmark ANASHION in black serif with a magenta disc behind "AN"; tagline "A nation of fashion" in script. Recreated in `frontend/src/components/brand/Logo.tsx`.
- Tokens (`globals.css`): paper #fbfaf9, mist #f1eeec, ink #141114, pink #e3187d (brand), pink-deep #b50e62, wine #3a0a22, gold #c9a24a (zari accent).
- Fonts: Cormorant Garamond (display), Manrope (UI), Great Vibes (script).

## Decisions
| Date | Decision | Rationale | Alternatives rejected |
|------|----------|-----------|-----------------------|
| 2026-11-14 | Docs: `CLAUDE.md` (rules), this file (state), `docs/*` (details) | Token-efficient persistent context | — |
| 2026-11-14 | Reference video stays local, gitignored | 87 MB, third-party content | Committing / LFS |
| 2026-11-14 | Original branding; reference used for motion/layout only | Don't clone another brand | — |
| 2026-11-14 | Next.js 16 + TS + Tailwind v4 + R3F + GSAP + Lenis; Vercel hosting | Best fit for WebGL + scroll animation; PR previews for two devs | Vite SPA, plain HTML, Render |
| 2026-11-14 | Headless WordPress + WooCommerce backend | Owner requirement: client edits products and content in WP | Shopify, custom DB |
| 2026-11-14 | Products via WooCommerce **Store API** (public, no keys) | No secrets in the frontend; includes prices, stock, images | WC REST v3 (needs keys), WPGraphQL (extra plugins) |
| 2026-11-14 | Homepage copy via custom plugin settings page + REST, not ACF | No paid ACF Pro needed; small and in the repo | ACF Pro options page |
| 2026-11-14 | Monorepo: `frontend/` + `wordpress/` | One repo for both devs | Separate repos |
| 2026-11-14 | Hero cloth is fully procedural (shader), no textures | Fast load, no image licensing | Video/texture hero |
| 2026-11-14 | Section membership via WooCommerce "placement" categories (`try-the-look`, `weave`…) | Client controls every section from Products with no extra plugin | Custom fields per section |
| 2026-11-14 | Bag is client-side (localStorage); checkout = hand-off to WooCommerce via `?anashion_cart=` | All WC/Pakistani payment gateways work unchanged; no secrets in the frontend | Headless Store API checkout |
| 2026-11-14 | Placeholder photos: Unsplash (free licence) hotlinked from mock data only | Owner asked for free stock until client shoots arrive | Downloading/committing images |
| 2026-11-14 | Sections built in parallel by 3 subagents (Opus: WebGL; Sonnet: commerce & media) with a shared brief; lead verifies | Speed; strict file ownership avoids conflicts | Single sequential build |

## Implementation status
- [x] Round 1 (2026-11-14): all 10 reference sections + footer, bag, ticker, WP plugin v0.2
- [x] Round 2 owner fixes (2026-11-14):
  - Hero: curtain parts from the centre into a procedural R3F boutique hallway (Mughal alcoves, fabric shelves, chandeliers, sofa). Camera dolly; 2 cut-out models walk in and sit (knee/hip hinge in the vertex shader). Optional scroll-scrubbed `hero.video` replaces the hallway. Files: `three/Boutique*.tsx`, `boutiqueLayout.ts`, `boutiqueTextures.ts`, `SilkCloth.tsx` (curtain), `hero/CssCurtain.tsx`
  - Occasions: lookbook photos, 3:5 arches, heads never cropped
  - Try the Look rebuilt: cut-out lineup, robust focus via a single `selected` state, hotspots, panel with real piece images ("Included" for price 0)
  - Pick a Fabric: no pin; drag/keys only; infinite wrap; slow auto-advance (paused on hover/focus/drag)
  - The Rail: sideways wardrobe (rotateY ~78°), selected garment faces front; Quick View modal with Front/Back flip, detail thumbs, colour tags that swap photos, sizes
  - Devotion: drag with momentum (no pin), fits one screen
  - Data: `Product.cutout`, `Product.colorways`, `hero.video`, `hero.models`; WP mapping + plugin fields
- [ ] Local WordPress install + end-to-end test
- [ ] Bundle discount enforced at WooCommerce checkout
- [ ] Product detail and category pages
- [ ] Real contact/appointment details; bridal photos from the client

## Test results (2026-11-14, round 2)
- ✅ `npm run lint` and `npm run build` (including TypeScript) pass.
- ✅ Browser at 1350×760: hero sequence closed curtain → parted → hallway → models walking → seated with headline. Occasions heads intact. Try the Look focus (Chandni) centred with hotspots; panel shows piece images. Fabrics not pinned, 760px tall, wraps after 14× ArrowLeft. Rail chips with counts; Quick View on Gulbahar: Mauve→Rose swaps `mauve-*`→`rose-*` photos and the Back flip works. Devotion drag 0→666px with momentum, not pinned, exactly 760px tall.
- ✅ 375×812: no horizontal overflow.
- ✅ Fresh load: no console errors (earlier errors were from mid-edit compiles).
- 🟡 Not verified: frame rate on a real laptop (pane ~40fps); hero reduced-motion, video and no-WebGL paths; touch on real devices; rail mobile sheet.
- ❌ WordPress side untested.

## Known issues, blockers & risks
- Weave bundle price is discounted in the bag only; WC checkout will charge full price (fix: plugin applies a discount for `anashion_bundle` items).
- Grouped-product → pieces mapping depends on a Store API field that is unverified.
- XAMPP PHP 8.0 may be too old for current WooCommerce. **(unverified)**
- WebGL load on low-end phones; scenes pause off-screen and cap DPR 1.75. Needs real-device testing.
- Unsplash placeholder photos (bridal only) are hotlinked. Replace them before launch.
- Rail section is ~847px at a 760px viewport (slightly over one screen).
- Seated-pose hinge assumes knee/hip at 27%/50% of cut-out height (`BoutiqueModel.tsx`); new model photos may need tuning.

## Key paths & commands
- Root: `C:\Users\WebTeam Nazim\Desktop\Fashion-Designing-Website`
- Frontend: `cd frontend && npm run dev | lint | build`. Env: `frontend/.env.local` (gitignored; template `.env.example`).
- Plugin: `wordpress/anashion-headless/anashion-headless.php`. Setup: [docs/wordpress-setup.md](docs/wordpress-setup.md).
- Reference video: `screen-20261114-160716-1794654392905.mp4` and `video-frames/` (local only, gitignored). Frames were extracted with Python + OpenCV in a scratch venv (ffmpeg not installed).

## Next steps
1. Both devs pull `main` and review the site in a full-size browser (`cd frontend && npm install && npm run dev`).
2. Set up local WordPress + WooCommerce ([docs/wordpress-setup.md](docs/wordpress-setup.md)) and test the plugin and checkout hand-off end to end.
3. Enforce the Weave bundle discount in WooCommerce checkout.
4. Add product detail and category pages.
5. Swap in the client's photos, contact details and appointment link.
