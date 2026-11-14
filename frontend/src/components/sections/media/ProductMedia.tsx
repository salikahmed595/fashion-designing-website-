// Product image that fills its parent; falls back to a swatch gradient when the product has no photo.
import Image from "next/image";
import { swatchOf } from "@/lib/catalog";
import type { Product } from "@/lib/types";

export function ProductMedia({
  product,
  sizes,
  priority = false,
  className = "",
  index = 0,
}: {
  product: Product;
  sizes: string;
  priority?: boolean;
  className?: string;
  index?: number;
}) {
  const img = product.images[index] ?? product.images[0];
  if (img) {
    return (
      <Image
        src={img.src}
        alt={img.alt || product.name}
        fill
        sizes={sizes}
        priority={priority}
        className={`object-cover ${className}`}
      />
    );
  }
  const [a, b, c] = swatchOf(product);
  return (
    <div
      role="img"
      aria-label={product.name}
      className={`absolute inset-0 ${className}`}
      style={{ background: `linear-gradient(145deg, ${a}, ${b ?? a} 55%, ${c ?? a})` }}
    />
  );
}
