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
- [x] Round 3 owner fixes (2026-11-14):
  - Hero: realistic teal/magenta/brass boutique (refs: teal scalloped-niche bridal stores). Lacquered walls, scalloped niches with instanced hanging-garment atlas, coffered ceiling, track spots, chandelier, marble reflector, velvet sofa and armchairs, mirror, display table. Soft shadows; post-processing (N8AO, Bloom, DOF, SMAA, vignette) on desktop with a performance monitor that sheds effects. New files `BoutiqueGarments.tsx`, `BoutiqueFurniture.tsx`, `boutiqueShapes.ts`
  - Models: vertex-shader gait (bob, pelvis shift/tilt, shoulder counter-rotation, lagged skirt swing, alternating leg push), curved path, turn to camera, sit; deformed shadow pass. Still a flat photo; truly natural walking needs `hero.video` or rigged characters
  - Rail: clothes-only viewer (owner chose drawn garments in real fabrics). `rail/GarmentArt.tsx` draws 8 garment kinds as SVG filled with lookbook fabric crops, front/back, colour tint. `rail/SwingTags.tsx` hanging colour tags. FRONT|BACK flip; QuickView kept for model photos. Real hanger photos (`garment.front/back`) replace the art when uploaded
  - Data: `Product.garment` (`kind`, `fabric`, `front`, `back`), `garmentKindOf()` in `lib/catalog.ts`
  - New deps: `@react-three/postprocessing`, `postprocessing`
- [x] Round 4 (2026-11-14):
  - **Performance:** `three/quality.ts` picks low/medium/high (Intel HD/UHD → low: no post-processing, no shadow maps, Lambert/Phong materials, DPR 1, 30fps cap, half the garments). The hero renders 0 frames off-screen or in a hidden tab. Measured low ≈ 6–7 ms GPU per frame on an HD 630 (pane). No backdrop-blur on the fixed navbar/ticker; Weave DPR ≤ 1.25; `OffscreenPauser` pauses CSS animations off-screen. Override with `?quality=low|medium|high`
  - **Hero choreography** after owner refs 28–30: models enter from the near left/right, walk in and sit on a foreground settee. Shared gait in `boutiqueWalk.ts`
  - **Rigged models:** `BoutiqueRiggedModel.tsx` loads `/models/model-1.glb` and `model-2.glb` (walk/sit/idle clips) on medium/high when present (`page.tsx` passes `riggedModels` via `existsSync`). Pipeline in `docs/3d-models.md`. No GLBs yet
  - **Occasions:** all round arches, photos anchored at top, neutral fill (the pink dome fade is removed)
  - **Rail:** streamer9-style front-facing wooden rack, Rack/Grid toggle, `rail/HangerModal.tsx` (show back, colour pills, sizes, add to bag, "See it on the model"). Shows only products with real/generated hanger photos once ≥4 exist; drawn `GarmentArt` until then
  - **Generated-image slots:** `public/generated/looks/<slug>.*` (Try the Look models on white, blended with multiply) and `public/generated/rail/<slug>[-colour]-front|back.*` are auto-detected by `lib/mock.ts` (`gen()`); restart dev after adding. Prompts in `docs/image-prompts.md`
- [x] Round 5 (2026-11-14):
  - **Generated images in:** 6 looks + 34 rail shots (all slugs and colourways). `npm run images` (`frontend/scripts/optimize-generated.mjs`, sharp) writes WebP next to each PNG: 85.9 MB → 6.4 MB. PNG originals are gitignored; `gen()` prefers `.webp`
  - **Colour mismatches handled:** the main `gulbahar` hanger shots came out wine-red and the main `saba` ones lilac (the prompts asked for mauve and olive). They're kept as extra colourways **Wine** and **Lilac** (seed `rail` override in `lib/mock.ts`); the first colourway (Mauve/Olive) is the default
  - **Sofa:** only one sofa now, under the end arch (`SOFA` in `boutiqueLayout.ts` moved to z −1.72; the foreground settee and `END_SOFA_DZ` were removed). Models step out of the side doorways (`HALL.doorZ`) and sit on it; the armchairs and pouf moved clear of the path; `FINAL_CAM` z shifted by −3.17
  - **Rigged models built in Blender 5.2** (headless) from the owner's front/back references (`frontend/public/models/references/`, gitignored): `frontend/scripts/rig/prep.py` (OpenCV: GrabCut mask, back aligned and mirrored, depth from the distance transform, joints from proportions plus measured hands) and `rig/build.py` (2.5D volumetric mesh with front/back textures, 15-bone armature, procedural skin weights, `walk`/`sit`/`idle` actions, GLB with WebP textures). Output: `model-1.glb` (1.8 MB, 25k verts) and `model-2.glb` (2.4 MB, 33k verts). Now loaded on **all** tiers. The side views stretch the edge pixels (it's not a true 3D scan)
- Round 5 check (pane, 1350×760, `?quality=low`, dev restarted so `existsSync` sees the GLBs): both GLBs load (≈1.0/1.4 MB gzipped), models walk in, stand, sit on the arch sofa; scrolling back no longer mixes the seated idle into the walk (fixed in `BoutiqueRiggedModel.tsx`). Detail not judged: the pane was only ~270px wide
- [x] Round 6 (2026-11-14):
  - **Hero models removed permanently** (owner's call): `BoutiqueModel`, `BoutiqueRiggedModel`, `boutiqueWalk`, the GLBs, the Blender rig scripts and `docs/3d-models.md` are deleted; `hero.models` was dropped from the types, mock, `wp.ts` and the plugin. The sofa and armchairs are gone too
  - **Wardrobe ending:** `three/BoutiqueWardrobe.tsx` is a backlit walk-in wardrobe in the end arch (after the owner's closet refs): side bays with bags, LED strips, sideways garments and drawers; a centre bay with black-framed glass doors that open (`BEATS.doors`) onto three front-facing gowns; bench and rug. The garments are the rail hanger cut-outs (`page.tsx` → `Hero wardrobe` prop). The camera ends square on it (`FINAL_CAM`)
  - **Fade to 2D:** at `BEATS.fade` (0.86–0.98) a paper veil fades in and the hero copy crossfades from white to ink (`HeroCopy` rendered twice in `Hero.tsx`)
  - **Transparent cut-outs:** `frontend/scripts/cutout.py` (OpenCV GrabCut seeded by background distance) writes `public/generated/cut/{looks,rail}/*.webp`; `gen()` prefers them. Try the Look and the rail no longer use `mix-blend-multiply` for cut-outs
  - **Rail = streamer9-style closet:** garments hang sideways (rotateY ±74°, packed 50px apart) and only the selected one turns to face front (`TheRail.tsx`)
  - Owner's replacement images (gulnar, chandni, mehr) are in
  - Verified in the pane at 1350×760 low: wardrobe and doors render, fade ends on the light copy, rail and Try the Look show cut-outs; lint, tsc and build pass. Detail **unverified** (the pane is only ~270px wide); mobile not checked
- [ ] Local WordPress install + end-to-end test
- [ ] Client's real hanger photos (front/back) for each product
- [ ] Bundle discount enforced at WooCommerce checkout
- [ ] Product detail and category pages
- [ ] Real contact/appointment details; bridal photos from the client

## Test results (2026-11-14, round 4)
- ✅ `npm run lint` and `npm run build` pass.
- ✅ 1350×760: hero ends with both models seated large in the foreground; Occasions heads intact with no pink; rail rack 762px tall; rail modal opens and closes on Escape; no console errors, including hydration.
- ✅ Low tier in the pane: 30 renders/s at about 6–7 ms GPU; 0 frames when scrolled past the hero.
- 🟡 Not verified: the owner's real machine; medium-tier numbers; GLB loading (no files); generated images (none yet); reduced-motion and video paths; rail drag and grid; mobile rail.
- ❌ WordPress side untested.
- Tip: dev mode (`npm run dev`) is much heavier than production. Judge speed with `npm run build && npm start`.

## Known issues, blockers & risks
- Weave bundle price is discounted in the bag only; WC checkout will charge full price (fix: plugin applies a discount for `anashion_bundle` items).
- Grouped-product → pieces mapping depends on a Store API field that is unverified.
- XAMPP PHP 8.0 may be too old for current WooCommerce. **(unverified)**
- WebGL load on low-end phones; scenes pause off-screen and cap DPR 1.75. Needs real-device testing.
- Unsplash placeholder photos (bridal only) are hotlinked. Replace them before launch.
- Rail section is ~834px at a 760px viewport (slightly over one screen).
- WordPress hanger photos must be transparent PNG/WebP to look right in the wardrobe and rail.

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
