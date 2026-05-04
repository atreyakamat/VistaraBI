import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // ── File Upload Configuration ──
  // Increase max body size for file uploads
  // Configure the middleware client max body size for App Router
  experimental: {
    esmExternals: true,
    middlewareClientMaxBodySize: '500mb',
  },
};

export default nextConfig;
