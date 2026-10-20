import type { NextConfig } from "next";
const config: NextConfig = {
  // Keep local demo builds small on machines with limited disk space.
  webpack(config, { dev }) {
    if (!dev) config.cache = false;
    return config;
  },
};
export default config;
