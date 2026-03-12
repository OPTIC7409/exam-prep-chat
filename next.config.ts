import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep parsers as Node externals to avoid Turbopack/serverless bundling quirks.
  serverExternalPackages: ["pdf-parse", "office-text-extractor"],
};

export default nextConfig;
