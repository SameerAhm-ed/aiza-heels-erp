import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["mongoose", "@react-pdf/renderer"],
};

export default nextConfig;
