import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tests build into their own folder (tests/e2e/run.mjs sets NEXT_DIST_DIR) so they never
  // clobber a running `next dev`. Vercel and normal builds use the default ".next".
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
};

export default nextConfig;
