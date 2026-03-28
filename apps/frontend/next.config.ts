import type { NextConfig } from "next";
import { resolveMonorepoRoot } from "./lib/monorepoRoot";

const nextConfig: NextConfig = {
  turbopack: {
    /** Stable monorepo root whether `cwd` is `apps/frontend` or the repo root on Vercel. */
    root: resolveMonorepoRoot(process.cwd()),
  },
};

export default nextConfig;
