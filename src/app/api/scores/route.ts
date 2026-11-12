/**
 * Global leaderboards for the mini games, stored in Upstash Redis (Vercel's
 * Marketplace "Upstash for Redis" sets KV_REST_API_URL / KV_REST_API_TOKEN).
 * Without that storage connected, GET answers { connected: false } and POST 503,
 * and the site falls back to local (this-browser) leaderboards.
 *
 * Scores come from a browser game, so they can't be fully trusted. The guards
 * here keep things sane: three-letter initials only (no free text to moderate),
 * per-mode score caps, a minimum play time per point, and a per-IP rate limit.
 */
import type { NextRequest } from "next/server";

const MODES = ["asteroids", "keepy", "stacker", "flabby"] as const;
type Mode = (typeof MODES)[number];

/** Highest believable score, and the least time (ms) a point can take. */
const LIMITS: Record<Mode, { max: number; msPerPoint: number }> = {
  asteroids: { max: 50000, msPerPoint: 20 },
  keepy: { max: 1000, msPerPoint: 250 },
  stacker: { max: 300, msPerPoint: 300 },
  // A pipe every 56 px at up to 1.9 px a frame (30 fps) is about 1 s a point at top speed.
  flabby: { max: 500, msPerPoint: 600 },
};

const BLOCKED = new Set(["ASS", "FUK", "FUC", "FCK", "SEX", "CUM", "DIK", "KKK", "NIG", "FAG", "TIT", "XXX"]);

function store() {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function redis(commands: (string | number)[][]) {
  const s = store()!;
  const res = await fetch(`${s.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${s.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
    signal: AbortSignal.timeout(5000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`store ${res.status}`);
  return (await res.json()) as { result: unknown }[];
}

const isMode = (m: unknown): m is Mode => MODES.includes(m as Mode);
const unavailable = () => Response.json({ error: "Global leaderboards aren't connected yet." }, { status: 503 });

async function top(mode: Mode) {
  const [r] = await redis([["ZREVRANGE", `lb:${mode}`, 0, 9, "WITHSCORES"]]);
  const flat = (r.result as string[]) ?? [];
  const scores: { initials: string; score: number }[] = [];
  for (let i = 0; i < flat.length; i += 2) scores.push({ initials: flat[i].slice(0, 3), score: Number(flat[i + 1]) });
  return scores;
}

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("mode");
  if (!isMode(mode)) return Response.json({ error: "Unknown mode" }, { status: 400 });
  // Not an error for the visitor: the site just shows local leaderboards.
  if (!store()) return Response.json({ connected: false, scores: [] }, { headers: { "Cache-Control": "no-store" } });
  try {
    return Response.json({ connected: true, scores: await top(mode) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return unavailable();
  }
}

export async function POST(request: NextRequest) {
  if (!store()) return unavailable();
  // Same-origin only: the CSP already limits the site's own requests, and this
  // stops other sites from posting scores with a visitor's browser.
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: { mode?: unknown; initials?: unknown; score?: unknown; ms?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
  const { mode, score, ms } = body;
  const initials = typeof body.initials === "string" ? body.initials.toUpperCase() : "";
  if (!isMode(mode) || !/^[A-Z]{3}$/.test(initials) || BLOCKED.has(initials)) {
    return Response.json({ error: "Use three letters for your initials." }, { status: 400 });
  }
  const limit = LIMITS[mode];
  if (!Number.isInteger(score) || (score as number) < 1 || (score as number) > limit.max) {
    return Response.json({ error: "That score doesn't look right." }, { status: 400 });
  }
  if (typeof ms !== "number" || ms < (score as number) * limit.msPerPoint) {
    return Response.json({ error: "That score doesn't look right." }, { status: 400 });
  }

  const ip = (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  try {
    const [hits] = await redis([["INCR", `rl:${ip}`], ["EXPIRE", `rl:${ip}`, 60]]);
    if (Number(hits.result) > 10) return Response.json({ error: "Too many scores. Try again in a minute." }, { status: 429 });
    // One entry per initials per mode: keep their best.
    await redis([["ZADD", `lb:${mode}`, "GT", score as number, initials], ["ZREMRANGEBYRANK", `lb:${mode}`, 0, -101]]);
    return Response.json({ scores: await top(mode) });
  } catch {
    return unavailable();
  }
}
