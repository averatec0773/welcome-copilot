import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Serverless functions share no memory — counters must live in Redis.
let limiters: { perIp: Ratelimit; global: Ratelimit; unlockGlobal: Ratelimit } | null = null;

export function getLimiters() {
  if (!limiters) {
    const redis = Redis.fromEnv();
    limiters = {
      perIp: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(8, "1 m"), prefix: "ask:ip" }),
      global: new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(300, "1 d"), prefix: "ask:global" }),
      unlockGlobal: new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(100, "1 d"), prefix: "unlock:global" }),
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
