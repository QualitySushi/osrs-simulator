import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // Optional: if you're using basePath for subfolders
  // basePath: '/your-subfolder',
  
  // Optional: if you have issues with dynamic routes
  // exportTrailingSlash: true,
};

export default nextConfig;