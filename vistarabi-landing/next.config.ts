import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const nextConfig: NextConfig = {
  /* config options here */
  
  // ── File Upload Configuration ──
  // Increase max body size for file uploads
  // Configure the middleware client max body size for App Router
  experimental: {
    esmExternals: true,
    proxyClientMaxBodySize: '500mb',
  },
};

export default withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
})(nextConfig);
