import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['192.168.5.11'],
  devIndicators: false,
  experimental: {
    optimizeCss: true,
  },
};

export default nextConfig;
