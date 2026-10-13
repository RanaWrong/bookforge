import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  output: "standalone",
  // Allow local production verification alongside a running development server.
  distDir: process.env.BOOKFORGE_BUILD_DIR || ".next",
};

export default nextConfig;
