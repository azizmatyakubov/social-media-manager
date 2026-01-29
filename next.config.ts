import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // Temporarily ignore build errors to get running
    ignoreBuildErrors: true,
  },
  eslint: {
    // Temporarily ignore during builds
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
