import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    /** Monorepo root (`pageaudit/`) so Turbopack doesn’t pick a parent lockfile by mistake. */
    root: path.resolve(process.cwd(), "../.."),
  },
};

export default nextConfig;
