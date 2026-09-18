/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Next.js 16 uses Turbopack by default; the legacy webpack aliases were
  // replaced by the `@/*` path mapping in tsconfig.json.
  turbopack: {},
};

module.exports = nextConfig;
