// Called by the `anashion-headless` WordPress plugin when products or
// homepage content change, so the site updates without a redeploy.
import { revalidateTag } from "next/cache";
import { TAGS } from "@/lib/wp";

const ALLOWED = new Set<string>(Object.values(TAGS));

export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || req.headers.get("x-revalidate-secret") !== secret) {
    return Response.json({ ok: false }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { tags?: unknown };
  const tags = Array.isArray(body.tags)
    ? body.tags.filter((t): t is string => typeof t === "string" && ALLOWED.has(t))
    : [];
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  return Response.json({ ok: true, revalidated: tags });
}
