import type { NextConfig } from "next";

// Allow next/image to optimise product images served by WordPress.
const wpHost = process.env.WP_URL ? new URL(process.env.WP_URL) : null;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Placeholder stock photos (mock data only).
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/photo-**" },
      ...(wpHost
        ? [
            {
              protocol: wpHost.protocol.replace(":", "") as "http" | "https",
              hostname: wpHost.hostname,
              pathname: "/wp-content/uploads/**",
            },
          ]
        : []),
    ],
  },
  cacheComponents: true,
  partialPrefetching: true,
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
