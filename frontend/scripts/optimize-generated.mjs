// Converts generated PNG/JPG images in public/generated/ to lightweight WebP
// (max 1400 px tall). The site prefers the .webp; the originals stay local and
// are gitignored. Run after adding images: `npm run images`.
import { readdir, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import sharp from "sharp";

const root = join(process.cwd(), "public", "generated");
const SRC = new Set([".png", ".jpg", ".jpeg"]);

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (SRC.has(extname(e.name).toLowerCase())) yield p;
  }
}

let n = 0;
let before = 0;
let after = 0;
for await (const file of walk(root)) {
  const out = file.slice(0, -extname(file).length) + ".webp";
  const src = await stat(file);
  const dst = await stat(out).catch(() => null);
  if (dst && dst.mtimeMs >= src.mtimeMs) continue;
  await sharp(file).resize({ height: 1400, withoutEnlargement: true }).webp({ quality: 82 }).toFile(out);
  before += src.size;
  after += (await stat(out)).size;
  n++;
}
console.log(n ? `${n} image(s): ${(before / 1e6).toFixed(1)} MB -> ${(after / 1e6).toFixed(1)} MB` : "All images already optimised.");
