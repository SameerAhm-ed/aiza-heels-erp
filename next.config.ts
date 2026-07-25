import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["mongoose", "@react-pdf/renderer"],
  },
  images: {
    domains: ["localhost"],
  },
  // Allow large PDF responses
  api: {
    responseLimit: "10mb",
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

export default nextConfig;
