import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: { "/api/gemini": ["./knowledge/**/*"], "/api/gemini/stream": ["./knowledge/**/*"], "/api/live/token": ["./knowledge/**/*"] },
};

export default nextConfig;
