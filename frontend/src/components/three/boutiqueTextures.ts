// Procedural canvas textures for the boutique hallway (no image downloads):
// cream marble tiles, a wine-and-gold runner/rug, a backlit jaali screen and a
// soft radial glow used for chandelier and lamp halos. Seeded, so every visit
// draws the same marble.
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

/** Cream marble: 2x2 tiles with soft clouds and fine grey-gold veins. */
export function marbleTexture(size = 1024) {
  const [c, g] = canvas(size, size);
  const r = rng(7);
  g.fillStyle = "#efe5d6";
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 40; i++) {
    const x = r() * size;
    const y = r() * size;
    const rad = 60 + r() * 220;
    const grad = g.createRadialGradient(x, y, 0, x, y, rad);
    const warm = r() > 0.5;
    grad.addColorStop(0, warm ? "rgba(226,206,184,0.35)" : "rgba(250,246,240,0.45)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
  }
  for (let i = 0; i < 26; i++) {
    let x = r() * size;
    let y = r() * size;
    let ang = r() * Math.PI * 2;
    g.beginPath();
    g.moveTo(x, y);
    const steps = 40 + r() * 80;
    for (let s = 0; s < steps; s++) {
      ang += (r() - 0.5) * 0.6;
      x += Math.cos(ang) * 8;
      y += Math.sin(ang) * 8;
      g.lineTo(x, y);
    }
    const gold = r() > 0.7;
    g.strokeStyle = gold ? "rgba(190,150,90,0.35)" : "rgba(140,124,110,0.22)";
    g.lineWidth = 0.6 + r() * 1.8;
    g.stroke();
  }
  // Tile joints.
  g.strokeStyle = "rgba(150,128,100,0.45)";
  g.lineWidth = 2;
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

/** Wine runner/rug with a gold border and lozenge motifs. `long` repeats along v. */
export function rugTexture(w: number, h: number, long = false) {
  const [c, g] = canvas(w, h);
  g.fillStyle = "#5c0f2f";
  g.fillRect(0, 0, w, h);
  const b = Math.round(w * 0.09);
  // Border bands.
  g.fillStyle = "#c9a24a";
  if (long) {
    g.fillRect(0, 0, b, h);
    g.fillRect(w - b, 0, b, h);
  } else {
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#5c0f2f";
    g.fillRect(b, b, w - 2 * b, h - 2 * b);
  }
  g.fillStyle = "#7a1838";
  if (long) {
    g.fillRect(b * 0.3, 0, b * 0.4, h);
    g.fillRect(w - b * 0.7, 0, b * 0.4, h);
  } else {
    g.strokeStyle = "#7a1838";
    g.lineWidth = b * 0.35;
    g.strokeRect(b * 0.5, b * 0.5, w - b, h - b);
  }
  // Inner fine gold line.
  g.strokeStyle = "rgba(217,178,92,0.9)";
  g.lineWidth = 2;
  if (long) {
    g.beginPath();
    g.moveTo(b * 1.4, 0);
    g.lineTo(b * 1.4, h);
    g.moveTo(w - b * 1.4, 0);
    g.lineTo(w - b * 1.4, h);
    g.stroke();
  } else {
    g.strokeRect(b * 1.4, b * 1.4, w - b * 2.8, h - b * 2.8);
  }
  // Lozenges down the middle.
  const n = long ? 4 : 3;
  for (let i = 0; i < n; i++) {
    const cy = ((i + 0.5) * h) / n;
    const rw = w * 0.22;
    const rh = (h / n) * 0.32;
    g.beginPath();
    g.moveTo(w / 2, cy - rh);
    g.lineTo(w / 2 + rw, cy);
    g.lineTo(w / 2, cy + rh);
    g.lineTo(w / 2 - rw, cy);
    g.closePath();
    g.fillStyle = "#8f1d46";
    g.fill();
    g.strokeStyle = "#d9b25c";
    g.lineWidth = 3;
    g.stroke();
    g.beginPath();
    g.arc(w / 2, cy, rw * 0.28, 0, Math.PI * 2);
    g.fillStyle = "#d9b25c";
    g.fill();
  }
  const t = finish(c);
  if (long) {
    t.wrapT = THREE.RepeatWrapping;
  }
  return t;
}

/** Backlit jaali: warm glow behind a lattice of eight-point stars. */
export function jaaliTexture(size = 512) {
  const [c, g] = canvas(size, size);
  const grad = g.createRadialGradient(size / 2, size * 0.62, 10, size / 2, size * 0.55, size * 0.7);
  grad.addColorStop(0, "#ffe2b0");
  grad.addColorStop(0.45, "#e9a46a");
  grad.addColorStop(1, "#5a1630");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  g.fillStyle = "rgba(60,14,30,0.82)";
  const cell = size / 12;
  for (let y = 0; y < 12; y++) {
    for (let x = 0; x < 12; x++) {
      const cx = (x + 0.5) * cell;
      const cy = (y + 0.5) * cell;
      // The solid stone around each star-shaped opening.
      g.beginPath();
      g.rect(x * cell, y * cell, cell, cell);
      const s = cell * 0.4;
      for (let k = 0; k < 16; k++) {
        const ang = (k / 16) * Math.PI * 2;
        const rr = k % 2 === 0 ? s : s * 0.62;
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
  grad.addColorStop(0.2, "rgba(255,255,255,0.55)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.14)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return finish(c, false);
}

/** Dark radial blob for contact shadows. */
export function shadowTexture(size = 128) {
  const [c, g] = canvas(size, size);
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(0,0,0,0.75)");
  grad.addColorStop(0.45, "rgba(0,0,0,0.35)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return finish(c, false);
}
