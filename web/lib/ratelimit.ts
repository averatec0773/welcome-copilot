import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Serverless functions share no memory — counters must live in Redis.
let limiters: { perIp: Ratelimit; global: Ratelimit } | null = null;

export function getLimiters() {
  if (!limiters) {
    const redis = Redis.fromEnv();
    limiters = {
      perIp: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(8, "1 m"), prefix: "ask:ip" }),
      global: new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(300, "1 d"), prefix: "ask:global" }),
    };
  }
  return limiters;
}
