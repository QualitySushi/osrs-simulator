import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  eslint: {
    // Disable ESLint during builds for deployment
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Optionally ignore TypeScript errors during build too
    ignoreBuildErrors: true,
  },
  // Optional: if you're using basePath for subfolders
  // basePath: '/your-subfolder',
  
  // Optional: if you have issues with dynamic routes
  // exportTrailingSlash: true,
};

export default nextConfig;