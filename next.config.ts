import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a production build run beside the dev server, e.g. NEXT_DIST_DIR=.next-build.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // A self contained server for the VPS: node .next/standalone/server.js.
  output: "standalone",
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
