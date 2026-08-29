import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The /api/ask handler reads handbook markdown from disk at runtime;
  // without this, Vercel's file tracing omits the content directory.
  outputFileTracingIncludes: { "/api/ask": ["./content/handbook/**/*"] },
};

export default nextConfig;
