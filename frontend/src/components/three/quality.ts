// Picks a rendering quality tier once on the client, so integrated GPUs (like an
// Intel HD 630 running a dev server and an editor) get a light scene, and only
// clearly capable desktops get shadows and post-processing.
// Override for testing with `?quality=low|medium|high` or
// localStorage["anashion-quality"].

export type Quality = "low" | "medium" | "high";

const TIERS: Quality[] = ["low", "medium", "high"];
const WEAK_GPU = /(intel.*(hd|uhd)\s*graphics|intel.*iris(?!.*xe)|mali|adreno|powervr|swiftshader|llvmpipe|software)/i;
const DISCRETE_GPU = /(nvidia|geforce|quadro|rtx|radeon\s*(rx|pro)|apple\s*m\d)/i;

function override(): Quality | null {
  try {
    const q = new URLSearchParams(window.location.search).get("quality");
    if (q && (TIERS as string[]).includes(q)) return q as Quality;
  } catch {}
  try {
    const s = window.localStorage.getItem("anashion-quality");
    if (s && (TIERS as string[]).includes(s)) return s as Quality;
  } catch {}
  return null;
}

/** The unmasked WebGL renderer string, or "" when unavailable. */
export function gpuRenderer(): string {
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") || c.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return "";
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return name;
  } catch {
    return "";
  }
}

let cached: Quality | null = null;

/** Decided once per page load (client only). */
export function detectQuality(): Quality {
  if (cached) return cached;
  const forced = override();
  if (forced) return (cached = forced);

  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean };
    deviceMemory?: number;
  };
  const mm = (q: string) => window.matchMedia(q).matches;
  const cores = nav.hardwareConcurrency ?? 4;
  const gpu = gpuRenderer();

  const low =
    mm("(prefers-reduced-motion: reduce)") ||
    nav.connection?.saveData === true ||
    (nav.deviceMemory !== undefined && nav.deviceMemory <= 4) ||
    cores <= 4 ||
    mm("(pointer: coarse)") ||
    mm("(max-width: 767px)") ||
    WEAK_GPU.test(gpu);
  if (low) return (cached = "low");
  if (DISCRETE_GPU.test(gpu) && cores >= 8) return (cached = "high");
  return (cached = "medium");
}
