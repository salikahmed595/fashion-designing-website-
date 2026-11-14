import { existsSync } from "node:fs";
import { join } from "node:path";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { OffscreenPauser } from "@/components/motion/OffscreenPauser";
import { CartProvider } from "@/components/cart/CartProvider";
import { BottomTicker } from "@/components/layout/BottomTicker";
import { Navbar } from "@/components/layout/Navbar";
import { BridalCollection } from "@/components/sections/BridalCollection";
import { DevotionStrip } from "@/components/sections/DevotionStrip";
import { FeelTheDrape } from "@/components/sections/FeelTheDrape";
import { Footer } from "@/components/sections/Footer";
import { Hero } from "@/components/sections/Hero";
import { InMotion } from "@/components/sections/InMotion";
import { Occasions } from "@/components/sections/Occasions";
import { PickAFabric } from "@/components/sections/PickAFabric";
import { TheRail } from "@/components/sections/TheRail";
import { TryTheLook } from "@/components/sections/TryTheLook";
import { Weave } from "@/components/sections/Weave";
import { inCategory } from "@/lib/catalog";
import { PLACEMENT } from "@/lib/types";
import { checkoutBase, getCatalog, getHomeContent } from "@/lib/wp";
import { cacheLife } from "next/cache";

// Copyright year, cached so prerendering stays deterministic.
async function currentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

/** Rigged hero models dropped into public/models (see docs/3d-models.md). */
const riggedModels = ["model-1.glb", "model-2.glb"]
  .filter((f) => existsSync(join(process.cwd(), "public", "models", f)))
  .map((f) => `/models/${f}`);

export default async function Home() {
  const [home, catalog, year] = await Promise.all([getHomeContent(), getCatalog(), currentYear()]);
  const { products } = catalog;
  const s = home.sections;
  const pick = (slug: string) => inCategory(products, slug);
  // Everything except dupattas/pieces hangs on the rail.
  const railProducts = products.filter((p) =>
    p.categories.some((c) => catalog.garmentTypes.some((g) => g.slug === c.slug)),
  );

  return (
    <CartProvider checkoutBase={checkoutBase}>
      <Navbar items={home.nav} />
      <main className="pb-8">
        <Hero hero={home.hero} heritage={home.heritage} marquee={home.marquee} riggedModels={riggedModels} />
        <Occasions copy={s.occasions} occasions={catalog.occasions} />
        <TryTheLook copy={s.tryLook} products={pick(PLACEMENT.tryLook)} />
        <PickAFabric copy={s.fabrics} products={pick(PLACEMENT.fabrics)} />
        <TheRail copy={s.rail} products={railProducts} garmentTypes={catalog.garmentTypes} />
        <DevotionStrip copy={s.devotion} products={pick(PLACEMENT.devotion)} />
        <FeelTheDrape copy={s.drape} products={pick(PLACEMENT.drape)} />
        <BridalCollection copy={s.collection} products={pick(PLACEMENT.collection)} />
        <InMotion copy={s.motion} products={pick(PLACEMENT.motion)} />
        <Weave copy={s.weave} products={pick(PLACEMENT.weave)} discountPercent={home.weave.discountPercent} />
      </main>
      <Footer footer={home.footer} nav={home.nav} year={year} />
      <BottomTicker items={home.ticker} />
      <CartDrawer />
      <OffscreenPauser />
    </CartProvider>
  );
}
