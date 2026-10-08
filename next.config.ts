import type { NextConfig } from "next";

export const BASE_PATH = "/collegetracker";
const OUTSIDE = "https://shultzphotography.com";

const nextConfig: NextConfig = {
  basePath: BASE_PATH,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  async redirects() {
    // This app owns ianshultz.com but only lives under /collegetracker.
    // Everything else goes to the photography site (temporary, so it can change later).
    return [
      { source: "/", destination: OUTSIDE, basePath: false, permanent: false },
      {
        source: "/:path((?!collegetracker(?:/|$)).*)",
        destination: OUTSIDE,
        basePath: false,
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
