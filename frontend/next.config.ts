import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.phototourl.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.imc.med.sa",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
