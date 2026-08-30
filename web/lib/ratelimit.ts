import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Serverless functions share no memory — counters must live in Redis.
let limiters: {
  perIp: Ratelimit; global: Ratelimit; unlockGlobal: Ratelimit;
  simPerIp: Ratelimit; simGlobal: Ratelimit;
} | null = null;

export function getLimiters() {
  if (!limiters) {
    // Accept both naming schemes: UPSTASH_* (direct Upstash) and KV_* (what the
    // Vercel Marketplace integration injects). Throw fast instead of letting the
    // client retry against an undefined URL.
    const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
    if (!url || !token) throw new Error("Redis env missing: set UPSTASH_REDIS_REST_* or KV_REST_API_*");
    const redis = new Redis({ url, token });
    limiters = {
      perIp: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(8, "1 m"), prefix: "ask:ip" }),
      global: new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(300, "1 d"), prefix: "ask:global" }),
      unlockGlobal: new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(1000, "1 d"), prefix: "unlock:global" }),
      // Demo-friendly retry headroom; the global cap still bounds total volume.
      simPerIp: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, "1 h"), prefix: "sim:ip" }),
      simGlobal: new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(1, "10 m"), prefix: "sim:global" }),
    };
  }
  return limiters;
}

export function clientIp(req: { headers: { get(name: string): string | null } }): string {
  // Prefer Vercel's tamper-proof header; otherwise take the LAST x-forwarded-for
  // entry (appended by the trusted proxy) — the first is attacker-controlled.
  const vercel = req.headers.get("x-vercel-forwarded-for");
  if (vercel) return vercel.split(",")[0].trim();
  const parts = (req.headers.get("x-forwarded-for") ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  return parts[parts.length - 1] ?? "unknown";
}
