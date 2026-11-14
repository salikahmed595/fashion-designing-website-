# Reference video breakdown

Source: `screen-20261114-160716-1794654392905.mp4`, kept in the project root, **gitignored** and never committed (87 MB, third-party content).
Format: 44 s portrait Instagram reel (1080×2400, 120 fps) of a laptop screen scrolling through a saree boutique site ("NOOLAM"). Reviewed frame by frame at 1 s intervals on 2026-11-14.

> Use this for **layout, interaction and motion ideas only**. Don't copy its brand name, copy text, imagery or exact design. Our site is an original Pakistani bridal-wear brand.

## Look & feel (observed)
- Light, airy off-white pages, with deep crimson/magenta as the brand accent and gold highlights.
- Elegant serif display headings. One word in each heading is set in the accent colour ("Try the **Look**", "Pick a **Silk**").
- A floating pill navbar with the brand logo on the left, a highlighted active item and a red CTA pill on the right.
- Each section is full-viewport, and scrolling moves from one to the next as distinct "scenes".
- Heavy use of depth: blur on unfocused items, perspective tilt and parallax.

## Sections in order (timestamp → what it does → our bridal adaptation)
| # | Time | Reference section | Animation / interaction | Pakistani bridal adaptation |
|---|------|-------------------|-------------------------|-----------------------------|
| 1 | 0–3 s | Hero: 3D boutique interior + close-up of red silk with gold motifs rippling; headline "Woven for the Divine." | Camera moves through a 3D store; WebGL fabric waving | 3D/WebGL hero: a rippling red-and-gold *zardozi* bridal dupatta, then a glide into a bridal atelier |
| 2 | 4 s | "Six Moods. Timeless …" banner with arches | Arched image cards fading in | "Every occasion": Mehndi, Mayun, Nikah, Baraat, Walima, Dholki |
| 3 | 5–10 s | "Try the Look": row of models plus a swatch list on the right | Click a model or swatch: it comes into focus, the rest blur back | "Try the Look": pick an outfit or colour and the model updates; others blur out |
| 4 | 11–12 s | "Pick a Silk": tilted colourful cards | 3D rotating card carousel / fan | "Pick your fabric": Karandi, Chiffon, Organza, Velvet, Tissue, Raw silk |
| 5 | 13–20 s | "Every silk, on the rail": garments on hangers, filter chips | Horizontal rail; a selected garment swings forward and others blur; chips filter | "On the rail": lehengas, ghararas, shararas, maxis and peshwas on hangers, with filter chips by category |
| 6 | 21–25 s | "Feel the drape": bento grid with a large central video and a CTA | Grid assembles; central media plays | "Feel the drape": bento grid of bridal shots and a central motion clip, with a "Shop the collection" CTA |
| 7 | 27, 34 s | "The Bridal Collection": arched cards on a curved 3D arc | Cards fan on an arc; centre card in focus | "The Bridal Collection": hero bridal looks on a 3D arc |
| 8 | 28–33 s | "Silk, in motion": vertical reel cards opening into a modal story viewer (dark backdrop, product name, price, add to bag) | Reel cards with hover play; a click opens a fullscreen story-style viewer | "Brides in motion": real-bride reels with a story viewer and product details |
| 9 | 35–41 s | "Three silks, one weave": 3D fabric ribbons twisting together, colour dots, price | WebGL ribbons morph and braid on scroll; colour picker recolours them | "Three threads, one legacy": gold, red and ivory ribbons braid in 3D; colour picker |
| 10 | 42 s | Footer: magenta block "Woven with heritage. Draped for today." and a large wordmark | Reveal on scroll | Deep-maroon footer with a large wordmark, links, WhatsApp/appointment CTA |

## Technical implications
- Needs real 3D/WebGL (cloth shader, braided ribbons, 3D carousels and arcs), so Three.js is required.
- Needs scroll-driven timelines and smooth scrolling, so GSAP ScrollTrigger and Lenis.
- Very image- and video-heavy, so asset optimisation (AVIF/WebP, compressed MP4/WebM, lazy loading) is critical.
- Mobile must stay fast: reduce or disable heavy WebGL on low-end devices and respect `prefers-reduced-motion`.
