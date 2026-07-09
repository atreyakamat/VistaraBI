import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const nextConfig: NextConfig = {
  // ── Docker / Production ──
  // Produces a self-contained .next/standalone directory for Docker images
  output: 'standalone',

  // ── File Upload Configuration ──
  experimental: {
    esmExternals: true,
    proxyClientMaxBodySize: '2000mb',
    serverActions: {
      bodySizeLimit: '2000mb',
    },
  },

  // ── Turbopack Aliases (Next.js 16 default bundler) ──
  turbopack: {
    resolveAlias: {
      'plotly.js/dist/plotly': 'plotly.js-dist-min',
    },
  },

  // ── Webpack Aliases (fallback for non-Turbopack builds) ──
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      'plotly.js/dist/plotly': 'plotly.js-dist-min',
    };
    return config;
  },
};

export default withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
})(nextConfig);


