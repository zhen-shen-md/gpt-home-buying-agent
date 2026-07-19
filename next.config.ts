import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the long-running dev cache isolated from `next build` output.
  // This prevents Webpack/build artifacts from invalidating the active dev server.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
};

export default nextConfig;
