/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Next.js 16 uses Turbopack by default; the legacy webpack aliases were
  // replaced by the `@/*` path mapping in tsconfig.json.
  turbopack: {},
  // The dev indicator sits at the bottom-left by default, where it overlaps the
  // footer copyright line. Keep it out of the content corner. Dev-only.
  devIndicators: {
    position: 'bottom-right',
  },
  // The browser reaches this dev server through the public runtime host, which
  // Next.js treats as cross-origin and blocks (breaking hydration). Dev-only.
  allowedDevOrigins: [
    'work-1-cdihnhudwvgircfm.prod-runtime.all-hands.dev',
    'work-2-cdihnhudwvgircfm.prod-runtime.all-hands.dev',
  ],
  // Dev proxy: the browser only reaches the public runtime host, so API calls
  // are proxied server-side to the backend. Disabled unless API_PROXY_TARGET
  // is set, so production builds are unaffected.
  /** Proxies API requests during local development when a backend target is configured. */
  async rewrites() {
    const target = process.env.API_PROXY_TARGET;
    if (!target) return [];
    return [{ source: '/api/:path*', destination: `${target}/:path*` }];
  },
};

module.exports = nextConfig;
