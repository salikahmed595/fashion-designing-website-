# Anashion | Pakistani Bridal Couture

Interactive, 3D-animated boutique storefront for Pakistani bridal wear.
**Next.js** storefront with a **headless WordPress + WooCommerce** backend (products, stock, orders and site content are all editable in WP admin).

## Stack
Next.js 16 · TypeScript · Tailwind CSS v4 · React Three Fiber (Three.js) · GSAP ScrollTrigger · Lenis · WordPress + WooCommerce

## Quick start (frontend)
```bash
cd frontend
npm install
cp .env.example .env.local   # leave WP_URL empty to use mock data
npm run dev                  # http://localhost:3000
```

Other commands (run inside `frontend/`): `npm run lint`, `npm run build`.

## Backend
See [docs/wordpress-setup.md](docs/wordpress-setup.md) for the local XAMPP setup and the `anashion-headless` plugin.

## Docs
- [docs/architecture.md](docs/architecture.md): how the pieces connect
- [docs/reference-video.md](docs/reference-video.md): section-by-section design reference
- [knowledge-graph.md](knowledge-graph.md): current status, decisions, next steps

## Working together
Pull before you start. Use one feature branch per section (`feat/<section>`) and merge into `main` through pull requests.
