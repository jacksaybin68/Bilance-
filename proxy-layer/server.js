'use strict';

/**
 * Dev reverse proxy — gom 3 service cục bộ về 1 port duy nhất.
 *
 *   http://localhost:8080/         → user frontend (Next.js :3001)
 *   http://localhost:8080/admin/*  → admin frontend (Vite :5173)
 *   http://localhost:8080/api/*    → backend NestJS (:3000)
 *
 * Chạy: node server.js   (hoặc: npm start)
 *
 * Ghi chú kỹ thuật (lý do của 2 quyết định dưới đây):
 * - `http-proxy` KHÔNG hỗ trợ option `pathRewrite` (chỉ `http-proxy-middleware`
 *   mới có) — option này bị bỏ qua im lặng. Vì vậy prefix được cắt thủ công từ
 *   `req.originalUrl` trước khi forward: dứt khoát, không phụ thuộc hành vi strip
 *   prefix của Express, và áp dụng được cho cả WebSocket upgrade (nhánh này
 *   không đi qua Express router nên `req.url` vẫn còn `/api/...`).
 * - Express 5 (path-to-regexp 8) không còn nhận `app.all('*')` hay `'/api/*'`
 *   (throw `Missing parameter name`), nên chỉ dùng `app.use(path, handler)`.
 */

const http = require('node:http');
const express = require('express');
const { createProxyServer } = require('http-proxy');

/** Port mặc định; mọi giá trị đều override được bằng biến môi trường. */
const DEFAULT_PORTS = {
  proxyPort: 8080, // điểm vào duy nhất
  userPort: 3001, // Next.js user app
  adminPort: 5173, // Vite admin app
  backendPort: 3000, // NestJS API
};

/** Tên biến môi trường tương ứng cho từng port. */
const ENV_KEYS = {
  proxyPort: 'PROXY_PORT',
  userPort: 'USER_PORT',
  adminPort: 'ADMIN_PORT',
  backendPort: 'BACKEND_PORT',
};

/** Prefix được forward tới service riêng; phần còn lại về user frontend. */
const ROUTES = [
  { prefix: '/api', portKey: 'backendPort' },
  { prefix: '/admin', portKey: 'adminPort' },
];

/**
 * Cắt `prefix` khỏi đầu `url`, giữ nguyên query string.
 *
 *   stripPrefix('/api', '/api')                           → '/'
 *   stripPrefix('/api/price/markets?ids=bitcoin', '/api') → '/price/markets?ids=bitcoin'
 *   stripPrefix('/apifoo', '/api')                        → '/apifoo' (không khớp prefix)
 */
function stripPrefix(url, prefix) {
  let rest;
  if (url === prefix) {
    rest = '';
  } else if (url.startsWith(`${prefix}/`) || url.startsWith(`${prefix}?`)) {
    rest = url.slice(prefix.length);
  } else {
    return url;
  }
  if (rest === '') return '/';
  return rest.startsWith('?') ? `/${rest}` : rest;
}

/** Đọc port từ env, fallback về DEFAULT_PORTS. Giá trị không hợp lệ bị bỏ qua. */
function readPorts(env = process.env) {
  const ports = { ...DEFAULT_PORTS };
  for (const [key, envKey] of Object.entries(ENV_KEYS)) {
    const parsed = Number.parseInt(env[envKey] ?? '', 10);
    if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 65535) ports[key] = parsed;
  }
  return ports;
}

/** Tìm route phù hợp với URL — dùng chung cho cả HTTP và WebSocket upgrade. */
function matchRoute(url) {
  for (const route of ROUTES) {
    if (
      url === route.prefix ||
      url.startsWith(`${route.prefix}/`) ||
      url.startsWith(`${route.prefix}?`)
    ) {
      return route;
    }
  }
  return null;
}

/**
 * Tạo Express app + http-proxy (chưa listen) — tách riêng để test gọi trực tiếp.
 * @param {typeof DEFAULT_PORTS} ports
 */
function createProxyApp(ports = DEFAULT_PORTS) {
  const targets = {
    userPort: `http://localhost:${ports.userPort}`,
    adminPort: `http://localhost:${ports.adminPort}`,
    backendPort: `http://localhost:${ports.backendPort}`,
  };

  const proxy = createProxyServer({ changeOrigin: true, ws: true, xfwd: true });

  proxy.on('proxyRes', (proxyRes, req) => {
    console.log(`[proxy] ◀ ${proxyRes.statusCode} ${req.method} ${req.originalUrl ?? req.url}`);
  });

  proxy.on('error', (err, req, res) => {
    console.error(`[proxy] ✗ ${err.message} — ${req.method} ${req.originalUrl ?? req.url}`);
    if (!res) return;
    // HTTP response → trả 502 rõ ràng; WebSocket socket → đóng để không rò rỉ.
    if (typeof res.writeHead === 'function' && !res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Bad Gateway — một service chưa ready');
    } else if (typeof res.destroy === 'function') {
      res.destroy();
    }
  });

  const app = express();

  // Các prefix riêng (/api, /admin): cắt prefix rồi forward tới service tương ứng.
  for (const route of ROUTES) {
    app.use(route.prefix, (req, res) => {
      req.url = stripPrefix(req.originalUrl, route.prefix);
      proxy.web(req, res, { target: targets[route.portKey] });
    });
  }

  // Mọi request còn lại → user frontend (Next.js giữ nguyên path).
  app.use((req, res) => {
    proxy.web(req, res, { target: targets.userPort });
  });

  return { app, proxy, targets };
}

/**
 * Tạo HTTP server đã gắn routing HTTP + WebSocket upgrade.
 * @param {typeof DEFAULT_PORTS} ports
 */
function createProxyServerInstance(ports = DEFAULT_PORTS) {
  const { app, proxy, targets } = createProxyApp(ports);
  const server = http.createServer(app);

  // WebSocket/HMR: nhánh này không đi qua Express nên phải tự cắt prefix.
  server.on('upgrade', (req, socket, head) => {
    const url = req.url ?? '';
    const route = matchRoute(url);
    if (route) {
      req.url = stripPrefix(url, route.prefix);
      proxy.ws(req, socket, head, { target: targets[route.portKey] });
      return;
    }
    proxy.ws(req, socket, head, { target: targets.userPort });
  });

  server.on('listening', () => {
    const address = server.address();
    const port =
      typeof address === 'object' && address !== null ? address.port : ports.proxyPort;
    console.log(`▶ Dev proxy listening tại http://localhost:${port}`);
    console.log(`   /           → user frontend  :${ports.userPort}`);
    console.log(`   /admin/*    → admin frontend :${ports.adminPort}`);
    console.log(`   /api/*      → backend API    :${ports.backendPort}`);
  });

  return server;
}

/** Khởi động proxy và trả về server đang listen. */
function start(ports = readPorts()) {
  const server = createProxyServerInstance(ports);
  server.listen(ports.proxyPort);
  return server;
}

if (require.main === module) {
  start();
}

module.exports = {
  DEFAULT_PORTS,
  ENV_KEYS,
  ROUTES,
  stripPrefix,
  matchRoute,
  readPorts,
  createProxyApp,
  createProxyServerInstance,
  start,
};
