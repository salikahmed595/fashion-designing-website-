# Image prompts for generated placeholders

Generate these with any image tool (ChatGPT/DALL·E, Gemini/Imagen, Midjourney, Flux, Leonardo…), then save them in the folders below **with exactly these file names**. The site picks them up automatically (`.webp`, `.png` or `.jpg` all work). Then run `npm run images` in `frontend/` (makes small WebP copies the site uses; the PNG originals stay local) and **restart `npm run dev`.**

These are placeholders until the client's real photoshoot. Real photos uploaded to WooCommerce replace them (see `wordpress-setup.md`).

Tips: generate each look 2–4 times and keep the best. Ask for the **same model** across images if your tool supports a reference/character feature. Keep the backgrounds exactly as specified: the site blends the white/grey away so nothing needs cutting out.

---

## 1. Try the Look: full-length models on white

**Save to:** `frontend/public/generated/looks/<file>.png`
**Size:** portrait 2:3, at least 1600 × 2400 px.

**Style (put in front of every prompt):**
> Full-length high-end fashion catalogue photo of one elegant Pakistani woman in her late 20s, standing straight and facing the camera in a relaxed natural pose, arms softly by her sides, whole body visible from a little above the head to just below the feet, centred, on a pure seamless white studio background (#FFFFFF), soft even studio lighting, only a faint natural shadow directly under the feet, no props, no text, no logo, photorealistic, sharp focus on the fabric and embroidery, 85mm lens, luxury lookbook style, portrait 2:3.

| File | Outfit (append to the style) |
|------|------------------------------|
| `noor-embroidered-gown` | Wearing a black georgette floor-length gown with long sheer sleeves covered in ivory threadwork embroidery, an asymmetric diagonal panel of dense ivory floral threadwork running from one shoulder to the hem, and a finely pleated black skirt. Sleek low bun, pearl drop earrings. |
| `shab-embroidered-abaya` | Wearing an open black crepe abaya over a black top and wide black trousers, with hand-embroidered gold and wine-red florals cascading over one shoulder, around the cuffs and along the hem. Holding a small black beaded potli bag with gold fringe. Braided bun, gold earrings. |
| `chandni-lace-kaftan` | Wearing an ivory chikan-lace kaftan with wide butterfly sleeves and crochet-trimmed edges, a keyhole stand collar with a pearl button, and large black appliqué flowers on the lower skirt and sleeves. Low bun, floral pearl earrings. |
| `gulbahar-embroidered-kaftan` | Wearing a dusty mauve kaftan with ivory paisley and floral embroidery, an embroidered U-shaped yoke at the neckline, cape-like sleeves and a scalloped crochet hem. Low bun, statement earrings. |
| `saba-draped-cape-set` | Wearing an olive satin draped cape over a matching high-neck shell top and wide-leg trousers, with tonal olive micro-embroidery sprigs on the shoulder, cuffs and trouser hem. Holding a small cream structured handbag. Low bun, gold earrings. |
| `mehr-contrast-kaftan` | Wearing an ivory crepe kaftan with a wide black contrast border along the hem and the sleeve edges, a tie neck with small tassels, over wide black trousers. Holding a slouchy black leather bag. Sleek bun, sculptural gold earrings. |

---

## 2. The Rail: garments alone on a hanger (front and back)

**Save to:** `frontend/public/generated/rail/<file>-front.png` and `<file>-back.png`
**Size:** portrait 3:4, at least 1500 × 2000 px.

**Style (put in front of every prompt):**
> E-commerce product photo of a single garment hanging alone on a hanger, with no person and no visible mannequin, hung from a light natural-wood hanger with a brass hook at the top centre. The whole garment is visible from hook to hem, centred, with the same camera distance and hanger in every image. Pure light-grey seamless background (#F2F0EE), soft even lighting, a very soft shadow, no text, no labels, no price tags, photorealistic fabric and embroidery detail, portrait 3:4.

For the **back** image, use the same prompt plus: **"Back view of the same garment on the same hanger, showing the back of the garment."**

| File | Garment (append to the style) |
|------|-------------------------------|
| `noor-embroidered-gown` | Black georgette floor-length gown with long sheer sleeves covered in ivory threadwork, an asymmetric diagonal panel of dense ivory floral embroidery and a pleated skirt. |
| `shab-embroidered-abaya` | Open black crepe abaya with long wide sleeves and hand-embroidered gold and wine-red florals on one shoulder, the cuffs and the hem. |
| `chandni-lace-kaftan` | Ivory chikan-lace kaftan with butterfly sleeves, crochet-trimmed edges, a keyhole stand collar and large black appliqué flowers on the lower half. |
| `gulbahar-embroidered-kaftan` | Dusty mauve kaftan with ivory paisley and floral embroidery, an embroidered U-shaped yoke and a scalloped crochet hem. |
| `saba-draped-cape-set` | Olive satin draped cape layered over a matching high-neck shell top, with matching wide-leg trousers hanging below on the same hanger, and tonal micro-embroidery sprigs. |
| `mehr-contrast-kaftan` | Ivory crepe kaftan with a wide black contrast border on the hem and sleeve edges and a tie neck with tassels. |
| `noor-e-jahan-lehenga` | Crimson raw-silk Pakistani bridal lehenga set: a short heavily embroidered choli on the hanger, the voluminous flared lehenga skirt hanging below it, antique gold zardozi borders, and a red kamdani dupatta draped over the hanger bar. |
| `shehzadi-gharara` | Deep red bridal gharara set: a short gota-work kurti on the hanger, gharara trousers flared from the knee with gold gota kinari bands hanging below, and a net dupatta over the bar. |
| `gulnar-sharara` | Bright pomegranate pink-red (#d4194f) tissue-silk sharara set: a short kameez with pastel resham flower buti and **silver** (not gold) borders, flared sharara trousers hanging below, and a blush organza dupatta. Must look clearly different from the deep red gold gharara. |
| `mehr-un-nisa-maxi` | Wine-red and gold floor-length Pakistani bridal pishwas maxi with a very full flared skirt and fine nakshi and dabka embroidery. |
| `zarqa-peshwas` | Plum peshwas (long flared frock) with silver mukesh scatter work and a scalloped embroidered hem. |
| `sabz-mehndi-lehenga` | Parrot-green mehndi lehenga set with mirror work, a short embroidered choli and a rani-pink dupatta draped over the hanger. |

**Colour options** (optional; these show when a colour pill is picked in the product pop-up). Same prompt as the product, with the colour changed:

| File base | Colour change |
|-----------|---------------|
| `gulbahar-embroidered-kaftan-mauve` | dusty mauve (same as the main one) |
| `gulbahar-embroidered-kaftan-rose` | dusty rose-pink kaftan with **black** embroidery |
| `gulbahar-embroidered-kaftan-ivory` | ivory kaftan with ivory-on-ivory embroidery |
| `saba-draped-cape-set-olive` | olive (same as the main one) |
| `saba-draped-cape-set-sand` | warm sand-beige, tonal sand embroidery |

Each needs `-front` and `-back` too, e.g. `gulbahar-embroidered-kaftan-rose-front.png`.

After adding or replacing images, also run `python scripts/cutout.py` in `frontend/` (needs `pip install opencv-python numpy`). It makes the transparent cut-outs in `public/generated/cut/` that Try the Look, the rail and the hero wardrobe use.
