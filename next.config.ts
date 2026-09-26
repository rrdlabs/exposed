import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/exposed",
  // Left at the Next default (no trailing slash) on purpose. Turning on
  // trailingSlash canonicalises the API routes to /exposed/api/scan/ as well,
  // which means a POST to /exposed/api/scan gets a 308 before it does any work.
  // Pages are not worth that; inbound links point at the canonical form.
  poweredByHeader: false,
};

export default nextConfig;
