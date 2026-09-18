/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Next.js 16 uses Turbopack by default; the legacy webpack aliases were
  // replaced by the `@/*` path mapping in tsconfig.json.
  turbopack: {},

  /**
   * API rewrite — forward /api/* → backend khi truy cập trực tiếp ở :3001
   * (không cần proxy-layer). Khi đi qua proxy-layer (:8080), proxy đã tự
   * strip /api và route về backend trước khi request đến Next.js.
   *
   * BACKEND_URL mặc định localhost:3000; override bằng env khi cần.
   */
  async rewrites() {
    const backendUrl = (process.env.BACKEND_URL ?? 'http://localhost:3000').replace(/\/$/, '');
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
