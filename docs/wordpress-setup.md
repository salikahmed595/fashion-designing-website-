# WordPress + WooCommerce backend setup

WordPress is the **admin panel only** (headless). The client edits products and content there, and the public site is the Next.js app in `frontend/`.

## What the client manages where
| What | Where in WP admin |
|------|-------------------|
| Products, prices, sale prices, stock, photos | **Products** (WooCommerce) |
| Sizes | Product attribute **Size** (e.g. XS, S, M, L, XL, Custom) |
| Front/back/detail photos | Product gallery in that order: front, back, then close-ups |
| Model cut-out (Try the Look, rail) | Upload a transparent PNG/WebP to the gallery with "cutout" in its alt text or filename |
| Colour options (Quick View tags) | Product attribute **Colour** with terms like `Rose #d4887f`; gallery holds front+back per colour, in the same order |
| Hero models / walk-through video | **Settings → Anashion Headless → Hero**: two cut-out images, optional MP4 |
| Card/ribbon colours | Product attribute **Swatch** with hex terms, e.g. `#e3187d` (optional; falls back to brand colours) |
| "Try the Look" pieces | Make the look a **Grouped product**; its children are the pieces (blouse, dupatta, jewellery…) **(unverified: Store API grouped field)** |
| Which products show in each homepage section | Product categories (slugs): `try-the-look`, `pick-a-fabric`, `devotion-edit`, `feel-the-drape`, `bridal-collection`, `in-motion`, `weave` |
| Garment filter chips on The Rail | Child categories of `garments` (Lehenga, Gharara, Sharara, Bridal Maxi, Peshwas, Dupatta) |
| Occasion arches | Child categories of `occasions` (name, description, **category image**) |
| All homepage text, hero/heritage images, ribbon words, ticker, bundle discount, footer | **Settings → Anashion Headless** (empty field = keep the default text) |
| Top navigation links | **Appearance → Menus**, location "Storefront main menu" |
| Orders, customers, payments, shipping | **WooCommerce** (checkout runs on WordPress, so any WC payment gateway works) |

Changes go live within seconds. The plugin pings the storefront's `/api/revalidate` endpoint, so there's no redeploy.

## Local setup (XAMPP, already installed on the dev PC)
1. Start Apache and MySQL in the XAMPP Control Panel.
2. Create database `anashion_wp` in phpMyAdmin (http://localhost/phpmyadmin).
3. Download WordPress from wordpress.org, extract it to `C:\xampp\htdocs\anashion-wp`, open http://localhost/anashion-wp and finish the installer.
4. Plugins → Add New: install and activate **WooCommerce**. In its setup, set currency to **PKR**.
5. Copy `wordpress/anashion-headless/` from this repo to `C:\xampp\htdocs\anashion-wp\wp-content\plugins\` and activate **Anashion Headless**.
6. Settings → Permalinks: choose **Post name**. The REST API needs pretty permalinks.
7. Settings → Anashion Headless: set Storefront URL `http://localhost:3000` and the same secret as `REVALIDATE_SECRET` in `frontend/.env.local`.
8. In `frontend/.env.local` set `WP_URL=http://localhost/anashion-wp` and restart `npm run dev`.

Check: http://localhost/anashion-wp/wp-json/wc/store/v1/products and http://localhost/anashion-wp/wp-json/anashion/v1/home should both return JSON.

> XAMPP here runs PHP 8.0. Current WooCommerce may need a newer PHP; check the plugin's requirements and upgrade XAMPP if activation fails. **(unverified)**

## Production
- Host WordPress on a managed WordPress host (e.g. a `cms.` or `admin.` subdomain). Host the Next.js storefront on Vercel. (Render is excluded.)
- Use HTTPS on both. Set `WP_URL` and `REVALIDATE_SECRET` as Vercel environment variables.
- Optional hardening: block public access to the WP theme front end (redirect to the storefront) and keep `/wp-admin` and `/wp-json` reachable.

## Plugin source
`wordpress/anashion-headless/anashion-headless.php` provides:
- the settings page (hero content and connection settings)
- `GET /wp-json/anashion/v1/home`
- the "Storefront main menu" menu location
- bag hand-off: `/?anashion_cart=ID:QTY[:SIZE],…` fills the WC cart (size saved on the order line) and redirects to checkout
- revalidation hooks: product or product category changed → `products`; settings or menu saved → `home`.
