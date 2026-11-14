// One face (front or back) of a garment for The Rail: the client's hanger photo (multiplied onto a light surface so
// its grey backdrop melts away) when one exists, otherwise the drawn garment tinted to the chosen colour.
import Image from "next/image";
import type { Product } from "@/lib/types";
import { swatchOf } from "@/lib/catalog";
import { GarmentArt } from "./GarmentArt";

export type Tag = { name: string; hex: string };

export const tagsOf = (p: Product): Tag[] =>
  p.colorways.length ? p.colorways.map((c) => ({ name: c.name, hex: c.hex })) : swatchOf(p).map((hex, i) => ({ name: `Swatch ${i + 1}`, hex }));

export function Face({ p, view, colour = 0, sizes = "260px" }: { p: Product; view: "front" | "back"; colour?: number; sizes?: string }) {
  const tags = tagsOf(p);
  const tag = tags[Math.min(colour, tags.length - 1)];
  const shot = p.colorways[colour]?.hanger?.[view] ?? (colour === 0 || !p.colorways.length ? p.garment[view] : null);
  // Transparent cut-outs sit as they are; plain-background photos are multiplied so the backdrop melts away.
  const blend = shot && !shot.src.includes("/cut/") ? " mix-blend-multiply" : "";
  if (shot) return <Image src={shot.src} alt="" fill sizes={sizes} draggable={false} className={`object-contain object-top${blend}`} />;
  return <GarmentArt kind={p.garment.kind} view={view} fabric={p.garment.fabric?.src ?? null} base={tag.hex} tint={colour > 0 ? tag.hex : null} className="h-full w-full" />;
}
