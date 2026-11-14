# CLAUDE.md — AI Operating Instructions

Persistent instructions for any AI agent working on this project. Keep this file short; put detail in `knowledge-graph.md` or `docs/*.md` and link to it.

## Project overview
- **Name:** Fashion-Designing-Website
- **Brand:** **Anashion**, a client's **Pakistani bridal wear** label (lehenga, gharara, sharara, maxi, peshwas).
- **Goal:** Modern, interactive, 3D-animated **e-commerce** storefront. The client manages products, stock, images and content in **WordPress + WooCommerce** (headless). Motion and layout follow a reference reel: [`docs/reference-video.md`](docs/reference-video.md).
- **Repo:** https://github.com/salikahmed595/fashion-designing-website- (branch `main`). Two developers (the owner and a friend) work on it together.
- **Status:** see `knowledge-graph.md` → Current state.

## Collaboration (two developers)
- Always `git pull` before starting work. Use short-lived feature branches (`feat/<section>`) and merge through PRs. Don't push straight to `main` without agreement.
- Split work by section/component to avoid editing the same files at the same time.
- The reference video (`*.mp4`) stays local and gitignored. Never commit it.

## Session start (every session)
1. Read this file.
2. Read only the relevant sections of [`knowledge-graph.md`](knowledge-graph.md) (start with **Current state** and **Next steps**).
3. Follow links to `docs/*.md` only when the task needs them.
4. Inspect the relevant code before changing it. Don't re-read the whole codebase.

## Critical rules
- Never add Claude/AI as author or co-author in commits or PRs; no "Generated with" lines.
- Commit only the files needed, plus standard extras (README, .gitignore). No clutter.
- Do not suggest Render for hosting.
- Do not silently change agreed requirements or architecture. Record decisions in `knowledge-graph.md` → Decisions.
- Never claim something is tested or verified without evidence (command + result).
- Never commit secrets. Use `.env` (gitignored) and keep a `.env.example`.

## Architecture & stack
- `frontend/`: Next.js 16 (App Router, Cache Components), TypeScript, Tailwind v4, React Three Fiber + drei, GSAP + `@gsap/react`, Lenis. Hosted on Vercel.
- `wordpress/anashion-headless/`: WP plugin providing editable content, a REST endpoint and revalidation webhooks. WooCommerce handles products and orders.
- Details: [`docs/architecture.md`](docs/architecture.md). Backend setup: [`docs/wordpress-setup.md`](docs/wordpress-setup.md).
- **Next.js 16 has breaking changes.** Read `frontend/node_modules/next/dist/docs/` before using an unfamiliar API.
- All WordPress access goes through `frontend/src/lib/wp.ts`. Components use the types in `lib/types.ts`, never raw WP JSON.
- Content the client should edit must come from WordPress (with a default in `lib/mock.ts`), never be hardcoded in components.
- Sections receive data only via props from `app/page.tsx`. Use `SectionHeading`, `useCart().add`, `formatPrice` and `swatchOf`, and the design tokens in `globals.css` (pink #e3187d is the brand accent).
- Images are placeholders hotlinked from Unsplash (mock only). Real photos come from WooCommerce. `next.config.ts` allows both hosts.
- Original brand only: use the reference video for motion and layout ideas, never for its brand, copy or imagery.

## Coding standards
- Small, verifiable changes; no unneeded rewrites.
- Semantic, accessible HTML (alt text, labels, contrast, keyboard navigation); responsive, mobile-first layout.
- Optimize images (modern formats, lazy-loading). A fashion site is image-heavy.
- Name things consistently; add project-specific conventions here once the stack is set.

## Testing & verification
- In `frontend/`: `npm run lint`, `npx tsc --noEmit`, `npm run build`. All must pass. (No unit test runner yet.)
- Dev server: `npm run dev` (port 3000), or the `frontend` entry in `.claude/launch.json`.
- Before calling a UI change done, check it in a browser at mobile (375px) and desktop widths. WebGL and GSAP don't animate in a hidden or background tab, so take screenshots with the page visible.
- PHP plugin: `php -l wordpress/anashion-headless/anashion-headless.php`.

## Subagents & models
- Delegate only independent, well-scoped tasks. Give each subagent just the context it needs.
- Haiku: simple, mechanical, low-cost tasks. Sonnet: routine implementation, testing, review. Opus: architecture, hard debugging, high-impact decisions.
- Subagents must report changed files, test results and unresolved issues. Verify their work before integrating it.
- For parallel UI work, give each subagent exclusive files and a shared brief: design tokens, data contracts, a "don't edit shared files" rule, and a requirement to run tsc + lint.
- Use only the agents and models actually available. Never claim a subagent was used when it wasn't.

## Documentation upkeep (before finishing any task)
1. Update this file if conventions or instructions changed.
2. Update `knowledge-graph.md` (state, decisions, issues, next steps).
3. Mark anything unverified as **unverified**.

## References
- [`knowledge-graph.md`](knowledge-graph.md): project knowledge, state, decisions, next steps.
- `docs/`: detailed reference files (create as needed).
