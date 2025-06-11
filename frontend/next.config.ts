import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  trailingSlash: true,
  transpilePackages: ['@tanstack/react-query', '@tanstack/query-core'],
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
