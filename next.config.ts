import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Ensure standalone output for Docker efficiency */
  output: "standalone",
  /* Add any other config below */
};

export default nextConfig;