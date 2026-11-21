import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Keep visited pages in the client router cache so back/forward and revisits are instant.
  // Mutations call revalidatePath, which clears it.
  experimental: { staleTimes: { dynamic: 30, static: 180 } },
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
