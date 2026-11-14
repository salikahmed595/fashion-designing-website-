// Procedural canvas textures for the boutique (no image downloads except the
// lookbook detail crops used inside the garment atlas): white veined marble,
// a pink/teal kilim runner and rug, a backlit teal-and-gold jaali, soft glows,
// baked ambient-occlusion gradients, a wall-wash light pool, and the hanging
// garment atlas (8 lehengas / gowns on brass hangers). Seeded, so every visit
// draws the same scene.
import * as THREE from "three";

/** Small deterministic PRNG (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

function finish(c: HTMLCanvasElement, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

function vein(g: CanvasRenderingContext2D, r: () => number, x: number, y: number, len: number, w: number, col: string) {
  let ang = r() * Math.PI * 2;
  g.beginPath();
  g.moveTo(x, y);
  for (let s = 0; s < len; s++) {
    ang += (r() - 0.5) * 0.5;
    x += Math.cos(ang) * 7;
    y += Math.sin(ang) * 7;
    g.lineTo(x, y);
  }
  g.strokeStyle = col;
  g.lineWidth = w;
  g.stroke();
}

/** Polished white marble: 2x2 large tiles with soft clouds and grey veins. */
export function marbleTexture(size = 1024) {
  const [c, g] = canvas(size, size);
  const r = rng(7);
  g.fillStyle = "#f4f1ec";
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 30; i++) {
    const x = r() * size;
    const y = r() * size;
    const rad = 80 + r() * 260;
    const grad = g.createRadialGradient(x, y, 0, x, y, rad);
    grad.addColorStop(0, r() > 0.5 ? "rgba(220,214,206,0.35)" : "rgba(255,255,255,0.5)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
  }
  for (let i = 0; i < 18; i++) vein(g, r, r() * size, r() * size, 50 + r() * 90, 3 + r() * 5, "rgba(170,165,160,0.10)");
  for (let i = 0; i < 30; i++) vein(g, r, r() * size, r() * size, 40 + r() * 90, 0.6 + r() * 1.4, "rgba(120,116,112,0.28)");
  // Tile joints.
  g.strokeStyle = "rgba(160,150,140,0.55)";
  g.lineWidth = 1.5;
  for (let i = 0; i <= 2; i++) {
    const p = (i * size) / 2;
    g.beginPath();
    g.moveTo(p, 0);
    g.lineTo(p, size);
    g.moveTo(0, p);
    g.lineTo(size, p);
    g.stroke();
  }
  const t = finish(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Kilim runner / rug: magenta field, teal and gold borders, lozenge medallions. */
export function rugTexture(w: number, h: number, long = false) {
  const [c, g] = canvas(w, h);
  const r = rng(long ? 3 : 5);
  g.fillStyle = "#8e1446";
  g.fillRect(0, 0, w, h);
  // Woven noise.
  for (let i = 0; i < w * h * 0.02; i++) {
    g.fillStyle = r() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.07)";
    g.fillRect(r() * w, r() * h, 2, 1);
  }
  const b = Math.round(w * 0.1);
  const band = (x: number, y: number, bw: number, bh: number, col: string) => {
    g.fillStyle = col;
    g.fillRect(x, y, bw, bh);
  };
  if (long) {
    band(0, 0, b, h, "#0f4f4a");
    band(w - b, 0, b, h, "#0f4f4a");
    band(b, 0, 4, h, "#d9b25c");
    band(w - b - 4, 0, 4, h, "#d9b25c");
    for (let y = 0; y < h; y += 24) {
      g.fillStyle = "#d9b25c";
      g.beginPath();
      g.moveTo(b / 2, y);
      g.lineTo(b * 0.8, y + 12);
      g.lineTo(b / 2, y + 24);
      g.lineTo(b * 0.2, y + 12);
      g.fill();
      g.beginPath();
      g.moveTo(w - b / 2, y);
      g.lineTo(w - b * 0.2, y + 12);
      g.lineTo(w - b / 2, y + 24);
      g.lineTo(w - b * 0.8, y + 12);
      g.fill();
    }
  } else {
    band(0, 0, w, h, "#0f4f4a");
    band(b * 0.5, b * 0.5, w - b, h - b, "#d9b25c");
    band(b * 0.6, b * 0.6, w - b * 1.2, h - b * 1.2, "#8e1446");
    g.strokeStyle = "#e3187d";
    g.lineWidth = b * 0.18;
    g.strokeRect(b, b, w - b * 2, h - b * 2);
  }
  const n = long ? 4 : 1;
  for (let i = 0; i < n; i++) {
    const cy = ((i + 0.5) * h) / n;
    const rw = w * (long ? 0.24 : 0.3);
    const rh = (h / n) * (long ? 0.3 : 0.3);
    for (const [k, col] of [
      [1, "#0f4f4a"],
      [0.72, "#d9b25c"],
      [0.5, "#e3187d"],
      [0.25, "#f6e7c8"],
    ] as const) {
      g.beginPath();
      g.moveTo(w / 2, cy - rh * k);
      g.lineTo(w / 2 + rw * k, cy);
      g.lineTo(w / 2, cy + rh * k);
      g.lineTo(w / 2 - rw * k, cy);
      g.closePath();
      g.fillStyle = col;
      g.fill();
    }
  }
  const t = finish(c);
  if (long) t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Backlit jaali: warm glow behind a teal lattice of eight-point stars. */
export function jaaliTexture(size = 512) {
  const [c, g] = canvas(size, size);
  const grad = g.createRadialGradient(size / 2, size * 0.7, 10, size / 2, size * 0.6, size * 0.75);
  grad.addColorStop(0, "#fff0c8");
  grad.addColorStop(0.5, "#e9b56a");
  grad.addColorStop(1, "#6b4a1e");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  g.fillStyle = "rgba(10,52,48,0.92)";
  const cells = 10;
  const cell = size / cells;
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const cx = (x + 0.5) * cell;
      const cy = (y + 0.5) * cell;
      g.beginPath();
      g.rect(x * cell, y * cell, cell, cell);
      const s = cell * 0.42;
      for (let k = 0; k < 16; k++) {
        const ang = (k / 16) * Math.PI * 2;
        const rr = k % 2 === 0 ? s : s * 0.6;
        const px = cx + Math.cos(ang) * rr;
        const py = cy + Math.sin(ang) * rr;
        if (k === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.fill("evenodd");
    }
  }
  return finish(c);
}

/** Soft white radial glow (tint it with the material colour). */
export function glowTexture(size = 128) {
  const [c, g] = canvas(size, size);
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.2, "rgba(255,255,255,0.5)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.12)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return finish(c, false);
}

/** Dark radial blob for contact shadows. */
export function shadowTexture(size = 128) {
  const [c, g] = canvas(size, size);
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(0,0,0,0.8)");
  grad.addColorStop(0.45, "rgba(0,0,0,0.35)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return finish(c, false);
}

/** Linear AO strip: dark at v = 0 (the corner), fading out. */
export function aoStripTexture() {
  const [c, g] = canvas(4, 128);
  const grad = g.createLinearGradient(0, 128, 0, 0);
  grad.addColorStop(0, "rgba(0,0,0,0.6)");
  grad.addColorStop(0.35, "rgba(0,0,0,0.2)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 128);
  return finish(c, false);
}

/** Light pool a track spot throws on a niche back: bright cone from the top. */
export function washTexture(size = 256) {
  const [c, g] = canvas(size, size);
  const grad = g.createRadialGradient(size / 2, size * 0.12, 0, size / 2, size * 0.25, size * 0.75);
  grad.addColorStop(0, "rgba(255,236,205,0.95)");
  grad.addColorStop(0.35, "rgba(255,214,160,0.45)");
  grad.addColorStop(1, "rgba(255,200,140,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return finish(c, false);
}

/** Niche back panel: deep teal, darker under the scalloped hood and at the sides (baked AO). */
export function nicheBackTexture() {
  const [c, g] = canvas(256, 512);
  g.fillStyle = "#0d4743";
  g.fillRect(0, 0, 256, 512);
  const top = g.createLinearGradient(0, 0, 0, 512);
  top.addColorStop(0, "rgba(0,10,10,0.75)");
  top.addColorStop(0.3, "rgba(0,10,10,0.15)");
  top.addColorStop(0.85, "rgba(0,10,10,0.05)");
  top.addColorStop(1, "rgba(0,10,10,0.45)");
  g.fillStyle = top;
  g.fillRect(0, 0, 256, 512);
  const side = g.createLinearGradient(0, 0, 256, 0);
  side.addColorStop(0, "rgba(0,10,10,0.5)");
  side.addColorStop(0.18, "rgba(0,0,0,0)");
  side.addColorStop(0.82, "rgba(0,0,0,0)");
  side.addColorStop(1, "rgba(0,10,10,0.5)");
  g.fillStyle = side;
  g.fillRect(0, 0, 256, 512);
  return finish(c);
}

/* ─────────────────────────── Garment atlas ─────────────────────────── */

/** Atlas layout: 4 x 2 cells, each 512 x 1024 (a garment on its hanger). */
export const GARMENT_CELLS = 8;
const CELL_W = 512;
const CELL_H = 1024;

const GARMENTS: { base: string; blouse: string; border: string; kind: "lehenga" | "gown"; photo: number }[] = [
  { base: "#c2185b", blouse: "#d9a441", border: "#e8c46a", kind: "lehenga", photo: 0 },
  { base: "#0f7a5a", blouse: "#0b5e46", border: "#e3c070", kind: "lehenga", photo: 1 },
  { base: "#e9a23b", blouse: "#c2185b", border: "#f4d58a", kind: "gown", photo: 2 },
  { base: "#f19bb8", blouse: "#f19bb8", border: "#f6e2b0", kind: "lehenga", photo: 3 },
  { base: "#6c2a8a", blouse: "#d4a017", border: "#e9cc7a", kind: "gown", photo: 4 },
  { base: "#a8d8c0", blouse: "#f2c6d4", border: "#e8d29a", kind: "lehenga", photo: 5 },
  { base: "#b3122e", blouse: "#b3122e", border: "#f0c860", kind: "lehenga", photo: 6 },
  { base: "#f4e3c4", blouse: "#e3187d", border: "#d9b25c", kind: "gown", photo: 7 },
];

/** Lookbook close-ups used as embroidery texture inside the garments. */
export const GARMENT_PHOTOS = [
  "/lookbook/mauve-d1.webp",
  "/lookbook/lace-d1.webp",
  "/lookbook/gown-d1.webp",
  "/lookbook/rose-d1.webp",
  "/lookbook/olive-d1.webp",
  "/lookbook/beige-d1.webp",
  "/lookbook/cape-d1.webp",
  "/lookbook/abaya-d1.webp",
];

function garmentPath(g: CanvasRenderingContext2D, kind: "lehenga" | "gown", r: () => number) {
  const W = CELL_W;
  const H = CELL_H;
  const cx = W / 2;
  const sh = H * 0.1; // shoulder line
  const waist = kind === "lehenga" ? H * 0.33 : H * 0.26;
  const hem = H * 0.985;
  const shW = W * 0.2;
  const wW = W * (kind === "lehenga" ? 0.13 : 0.16);
  const hemW = W * (0.44 + r() * 0.04);
  g.beginPath();
  g.moveTo(cx - W * 0.06, sh - H * 0.012);
  g.quadraticCurveTo(cx, sh + H * 0.03, cx + W * 0.06, sh - H * 0.012);
  g.lineTo(cx + shW, sh + H * 0.005);
  g.quadraticCurveTo(cx + shW * 1.05, sh + H * 0.08, cx + wW * 1.25, sh + H * 0.13);
  g.quadraticCurveTo(cx + wW * 0.95, waist - H * 0.04, cx + wW, waist);
  // Flared skirt with a soft wavy hem.
  g.bezierCurveTo(cx + wW * 2.2, waist + H * 0.2, cx + hemW * 0.95, hem - H * 0.25, cx + hemW, hem - H * 0.01);
  const waves = 7;
  for (let i = 1; i <= waves * 2; i++) {
    const x = cx + hemW - (i / (waves * 2)) * hemW * 2;
    const y = hem - (i % 2 === 0 ? H * 0.012 : -H * 0.004);
    g.lineTo(x, y);
  }
  g.bezierCurveTo(cx - hemW * 0.95, hem - H * 0.25, cx - wW * 2.2, waist + H * 0.2, cx - wW, waist);
  g.quadraticCurveTo(cx - wW * 0.95, waist - H * 0.04, cx - wW * 1.25, sh + H * 0.13);
  g.quadraticCurveTo(cx - shW * 1.05, sh + H * 0.08, cx - shW, sh + H * 0.005);
  g.closePath();
  return { sh, waist, hem, hemW, wW };
}

function drawGarment(
  g: CanvasRenderingContext2D,
  i: number,
  photos: (HTMLImageElement | null)[],
) {
  const spec = GARMENTS[i];
  const ox = (i % 4) * CELL_W;
  const oy = Math.floor(i / 4) * CELL_H;
  const r = rng(100 + i);
  g.save();
  g.translate(ox, oy);
  g.clearRect(0, 0, CELL_W, CELL_H);

  // Hanger: hook and bar.
  g.strokeStyle = "#c9a24a";
  g.lineCap = "round";
  g.lineWidth = 7;
  g.beginPath();
  g.arc(CELL_W / 2, CELL_H * 0.035, CELL_W * 0.035, Math.PI, Math.PI * 2.4);
  g.moveTo(CELL_W / 2, CELL_H * 0.06);
  g.lineTo(CELL_W / 2, CELL_H * 0.075);
  g.moveTo(CELL_W * 0.29, CELL_H * 0.105);
  g.lineTo(CELL_W / 2, CELL_H * 0.075);
  g.lineTo(CELL_W * 0.71, CELL_H * 0.105);
  g.stroke();

  const m = garmentPath(g, spec.kind, r);
  g.save();
  g.clip();
  // Base fabric, then the lookbook embroidery as luminance.
  g.fillStyle = spec.base;
  g.fillRect(0, 0, CELL_W, CELL_H);
  const photo = photos[spec.photo];
  if (photo) {
    g.globalAlpha = 0.55;
    g.globalCompositeOperation = "luminosity";
    const s = Math.max(CELL_W / photo.width, (CELL_H * 0.5) / photo.height) * 1.1;
    for (let y = m.waist - 40; y < CELL_H; y += photo.height * s * 0.9) {
      g.drawImage(photo, (CELL_W - photo.width * s) / 2, y, photo.width * s, photo.height * s);
    }
    g.drawImage(photo, (CELL_W - photo.width * s) / 2, m.sh - 20, photo.width * s, photo.height * s);
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    // Restore the jewel tone over the luminance pass.
    g.globalCompositeOperation = "color";
    g.fillStyle = spec.base;
    g.fillRect(0, 0, CELL_W, CELL_H);
    g.globalCompositeOperation = "source-over";
  }
  // Contrasting blouse / bodice.
  if (spec.kind === "lehenga") {
    g.fillStyle = spec.blouse;
    g.globalAlpha = 0.85;
    g.fillRect(0, 0, CELL_W, m.waist - CELL_H * 0.03);
    g.globalAlpha = 1;
  }
  // Waistband and hem borders (zari).
  const zari = (y: number, h: number) => {
    g.fillStyle = spec.border;
    g.fillRect(0, y, CELL_W, h);
    g.fillStyle = "rgba(90,50,10,0.35)";
    for (let x = 0; x < CELL_W; x += 14) g.fillRect(x, y + h * 0.3, 7, h * 0.4);
    g.fillStyle = "rgba(255,250,220,0.6)";
    g.fillRect(0, y, CELL_W, 2);
    g.fillRect(0, y + h - 2, CELL_W, 2);
  };
  zari(m.waist - CELL_H * 0.03, CELL_H * 0.025);
  zari(m.hem - CELL_H * 0.11, CELL_H * 0.08);
  zari(m.hem - CELL_H * 0.15, CELL_H * 0.012);
  // Scattered buti in gold.
  g.fillStyle = spec.border;
  for (let k = 0; k < 90; k++) {
    const y = m.waist + r() * (m.hem - m.waist - CELL_H * 0.16);
    const t = (y - m.waist) / (m.hem - m.waist);
    const half = m.wW + (m.hemW - m.wW) * Math.pow(t, 0.8);
    const x = CELL_W / 2 + (r() * 2 - 1) * half;
    g.globalAlpha = 0.75;
    g.beginPath();
    g.arc(x, y, 2 + r() * 3, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  // Pleats: vertical light/dark folds fanning out from the waist.
  const folds = 12 + Math.floor(r() * 5);
  for (let k = 0; k < folds; k++) {
    const t = (k + 0.5) / folds;
    const xTop = CELL_W / 2 + (t * 2 - 1) * m.wW;
    const xBot = CELL_W / 2 + (t * 2 - 1) * m.hemW * 1.05;
    const grad = g.createLinearGradient(xBot - 18, 0, xBot + 18, 0);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.5, k % 2 ? "rgba(0,0,0,0.28)" : "rgba(255,255,255,0.14)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.strokeStyle = grad;
    g.lineWidth = 26;
    g.beginPath();
    g.moveTo(xTop, m.waist);
    g.quadraticCurveTo((xTop + xBot) / 2, (m.waist + m.hem) / 2, xBot, m.hem);
    g.stroke();
  }
  // Volume: darker at the sides and toward the hem, sheen down the centre.
  const side = g.createLinearGradient(0, 0, CELL_W, 0);
  side.addColorStop(0, "rgba(0,0,0,0.55)");
  side.addColorStop(0.3, "rgba(0,0,0,0.05)");
  side.addColorStop(0.5, "rgba(255,255,255,0.08)");
  side.addColorStop(0.7, "rgba(0,0,0,0.05)");
  side.addColorStop(1, "rgba(0,0,0,0.55)");
  g.fillStyle = side;
  g.fillRect(0, 0, CELL_W, CELL_H);
  const vert = g.createLinearGradient(0, 0, 0, CELL_H);
  vert.addColorStop(0, "rgba(0,0,0,0.25)");
  vert.addColorStop(0.2, "rgba(0,0,0,0)");
  vert.addColorStop(0.85, "rgba(0,0,0,0.08)");
  vert.addColorStop(1, "rgba(0,0,0,0.35)");
  g.fillStyle = vert;
  g.fillRect(0, 0, CELL_W, CELL_H);
  g.restore();

  // Dupatta draped over one shoulder on some pieces.
  if (i % 3 === 0) {
    g.save();
    g.globalAlpha = 0.55;
    g.fillStyle = spec.border;
    g.beginPath();
    g.moveTo(CELL_W * 0.3, m.sh);
    g.lineTo(CELL_W * 0.42, m.sh);
    g.quadraticCurveTo(CELL_W * 0.36, CELL_H * 0.5, CELL_W * 0.22, CELL_H * 0.8);
    g.lineTo(CELL_W * 0.12, CELL_H * 0.78);
    g.quadraticCurveTo(CELL_W * 0.24, CELL_H * 0.45, CELL_W * 0.3, m.sh);
    g.fill();
    g.restore();
  }
  g.restore();
}

/**
 * The garment atlas (2048 x 2048). Drawn immediately with procedural fabric,
 * then redrawn with the lookbook embroidery crops once they load.
 */
export function garmentAtlas() {
  const [c, g] = canvas(CELL_W * 4, CELL_H * 2);
  const t = finish(c);
  t.anisotropy = 4;
  const photos: (HTMLImageElement | null)[] = GARMENT_PHOTOS.map(() => null);
  const draw = () => {
    for (let i = 0; i < GARMENT_CELLS; i++) drawGarment(g, i, photos);
    t.needsUpdate = true;
  };
  draw();
  let pending = GARMENT_PHOTOS.length;
  GARMENT_PHOTOS.forEach((src, i) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      photos[i] = img;
      if (--pending === 0) draw();
    };
    img.onerror = () => {
      if (--pending === 0) draw();
    };
    img.src = src;
  });
  return t;
}
