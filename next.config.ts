import type { NextConfig } from "next";

const isStaticExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  /* config options here */
  output: isStaticExport ? "export" : undefined,
  // Cache Components enables PPR, which cannot run in export mode.
  cacheComponents: !isStaticExport,
  partialPrefetching: !isStaticExport,
  reactCompiler: true,
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
