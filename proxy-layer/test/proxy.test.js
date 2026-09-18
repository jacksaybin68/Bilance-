'use strict';

/**
 * Smoke test cho dev reverse proxy — chạy bằng `npm test` (node --test).
 *
 * Không cần service thật: tự dựng 3 mock service (backend/admin/user) trên port
 * ngẫu nhiên, trỏ proxy vào đó, rồi assert path mà từng mock nhận được sau khi
 * proxy cắt prefix.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');
const proxyLayer = require('../server.js');

/** Mock service: ghi lại request nhận được rồi trả JSON nhận diện service. */
function createMockService(label) {
  const seen = [];
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      seen.push({
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: Buffer.concat(chunks).toString('utf8'),
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ service: label, url: req.url }));
    });
  });

  // WebSocket upgrade: trả handshake 101 rồi đóng socket.
  server.on('upgrade', (req, socket) => {
    seen.push({ method: 'UPGRADE', url: req.url });
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n',
    );
    socket.destroy();
  });

  return { label, server, seen };
}

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, () => resolve(server.address().port));
  });
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

/** Gửi một WebSocket upgrade thô qua proxy, trả về status line nhận được. */
function rawUpgrade(port, url) {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ port, host: '127.0.0.1' });
    let response = '';
    socket.setTimeout(3000);
    socket.on('connect', () => {
      socket.write(
        `GET ${url} HTTP/1.1\r\n` +
          'Host: 127.0.0.1\r\n' +
          'Upgrade: websocket\r\n' +
          'Connection: Upgrade\r\n' +
          'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n' +
          'Sec-WebSocket-Version: 13\r\n\r\n',
      );
    });
    socket.on('data', (chunk) => {
      response += chunk.toString('utf8');
      if (response.includes('\r\n')) {
        socket.destroy();
        resolve(response.split('\r\n')[0]);
      }
    });
    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error(`Timeout khi upgrade ${url}`));
    });
    socket.on('error', reject);
  });
}

test.describe('proxy-layer smoke test', () => {
  let backend;
  let admin;
  let user;
  let proxyServer;
  let proxyPort;

  test.before(async () => {
    backend = createMockService('backend');
    admin = createMockService('admin');
    user = createMockService('user');

    const [backendPort, adminPort, userPort] = await Promise.all([
      listen(backend.server),
      listen(admin.server),
      listen(user.server),
    ]);

    proxyServer = proxyLayer.createProxyServerInstance({
      proxyPort: 0,
      userPort,
      adminPort,
      backendPort,
    });
    proxyPort = await listen(proxyServer);
  });

  test.after(async () => {
    await Promise.all([
      close(proxyServer),
      close(backend.server),
      close(admin.server),
      close(user.server),
    ]);
  });

  const get = (url) => fetch(`http://127.0.0.1:${proxyPort}${url}`);
test('GET /api/price/markets → backend nhận /price/markets, giữ nguyên query string', async () => {
    const res = await get('/api/price/markets?ids=bitcoin,ethereum&vs=vnd');
    assert.equal(res.status, 200);
    const payload = await res.json();
    assert.equal(payload.service, 'backend');
    assert.equal(payload.url, '/price/markets?ids=bitcoin,ethereum&vs=vnd');
    assert.equal(backend.seen.at(-1).url, '/price/markets?ids=bitcoin,ethereum&vs=vnd');
  });

  test('GET /api (prefix trần) → backend nhận /', async () => {
    const res = await get('/api');
    assert.equal(res.status, 200);
    assert.equal((await res.json()).url, '/');
  });

  test('POST /api/orders → backend nhận body và header nguyên vn', async () => {
    const res = await fetch(`http://127.0.0.1:${proxyPort}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Client-Test': 'yes' },
      body: JSON.stringify({ symbol: 'BTC', amount: 1 }),
    });
    assert.equal(res.status, 200);
    const last = backend.seen.at(-1);
    assert.equal(last.url, '/orders');
    assert.equal(last.body, '{"symbol":"BTC","amount":1}');
    assert.equal(last.headers['x-client-test'], 'yes');
  });

  test('GET /admin/assets/index.js → admin nhận /admin/assets/index.js (giữ nguyên base path)', async () => {
    const res = await get('/admin/assets/index.js');
    assert.equal(res.status, 200);
    assert.equal((await res.json()).service, 'admin');
    assert.equal(admin.seen.at(-1).url, '/admin/assets/index.js');
  });

  test('GET /admin → admin nhận /admin (giữ nguyên base path)', async () => {
    const res = await get('/admin');
    assert.equal(res.status, 200);
    assert.equal((await res.json()).url, '/admin');
  });

  test('GET /market?q=1 → user frontend nhận nguyên path', async () => {
    const res = await get('/market?q=1');
    assert.equal(res.status, 200);
    assert.equal((await res.json()).service, 'user');
    assert.equal(user.seen.at(-1).url, '/market?q=1');
  });

  test('GET /apifoo → KHÔNG bị strip nhầm thành /foo, đi về user frontend', async () => {
    const res = await get('/apifoo');
    assert.equal(res.status, 200);
    assert.equal((await res.json()).service, 'user');
    assert.equal(user.seen.at(-1).url, '/apifoo');
  });

  test('WS upgrade /api/socket.io/... → backend nhận path đã cắt prefix', async () => {
    const statusLine = await rawUpgrade(proxyPort, '/api/socket.io/?EIO=4&transport=websocket');
    assert.match(statusLine, /^HTTP\/1\.1 101 /);
    assert.equal(backend.seen.at(-1).url, '/socket.io/?EIO=4&transport=websocket');
  });

  test('WS upgrade /_next/webpack-hmr → user frontend nhận path nguyên trạng', async () => {
    const statusLine = await rawUpgrade(proxyPort, '/_next/webpack-hmr?page=/');
    assert.match(statusLine, /^HTTP\/1\.1 101 /);
    assert.equal(user.seen.at(-1).url, '/_next/webpack-hmr?page=/');
  });
});
test.describe('proxy-layer đơn vị (không cần mạng)', () => {
  test('stripPrefix xử lý prefix trần, query, và trường hợp không khớp', () => {
    assert.equal(proxyLayer.stripPrefix('/api', '/api'), '/');
    assert.equal(proxyLayer.stripPrefix('/api?a=1', '/api'), '/?a=1');
    assert.equal(proxyLayer.stripPrefix('/api/price/markets', '/api'), '/price/markets');
    assert.equal(proxyLayer.stripPrefix('/api/price/markets?a=1', '/api'), '/price/markets?a=1');
    assert.equal(proxyLayer.stripPrefix('/apifoo', '/api'), '/apifoo');
    assert.equal(proxyLayer.stripPrefix('/apiary/x', '/api'), '/apiary/x');
    assert.equal(proxyLayer.stripPrefix('/admin', '/admin'), '/');
    assert.equal(proxyLayer.stripPrefix('/admin/assets/a.js', '/admin'), '/assets/a.js');
  });

  test('matchRoute phân loại đúng prefix, không khớp nhầm /apifoo', () => {
    assert.equal(proxyLayer.matchRoute('/api')?.prefix, '/api');
    assert.equal(proxyLayer.matchRoute('/api/price')?.prefix, '/api');
    assert.equal(proxyLayer.matchRoute('/admin/?x=1')?.prefix, '/admin');
    assert.equal(proxyLayer.matchRoute('/apifoo'), null);
    assert.equal(proxyLayer.matchRoute('/market'), null);
  });

  test('readPorts override bằng env, bỏ qua giá trị không hợp lệ', () => {
    const ports = proxyLayer.readPorts({
      PROXY_PORT: '9000',
      USER_PORT: '9001',
      ADMIN_PORT: 'abc',
      BACKEND_PORT: '99999',
    });
    assert.equal(ports.proxyPort, 9000);
    assert.equal(ports.userPort, 9001);
    assert.equal(ports.adminPort, proxyLayer.DEFAULT_PORTS.adminPort);
    assert.equal(ports.backendPort, proxyLayer.DEFAULT_PORTS.backendPort);
    assert.deepEqual(proxyLayer.readPorts({}), proxyLayer.DEFAULT_PORTS);
  });

  test('ENV_KEYS khớp tên biến môi trường ghi trong README', () => {
    assert.deepEqual(proxyLayer.ENV_KEYS, {
      proxyPort: 'PROXY_PORT',
      userPort: 'USER_PORT',
      adminPort: 'ADMIN_PORT',
      backendPort: 'BACKEND_PORT',
    });
  });
});

test('backend down → proxy trả 502 thay vì treo', async () => {
  const deadServer = http.createServer();
  const deadPort = await listen(deadServer);
  await close(deadServer);

  const user = createMockService('user');
  const userPort = await listen(user.server);

  const isolated = proxyLayer.createProxyServerInstance({
    proxyPort: 0,
    userPort,
    adminPort: userPort,
    backendPort: deadPort,
  });
  const isolatedPort = await listen(isolated);

  try {
    const res = await fetch(`http://127.0.0.1:${isolatedPort}/api/price/markets`);
    assert.equal(res.status, 502);
    assert.match(await res.text(), /Bad Gateway/);
  } finally {
    await close(isolated);
    await close(user.server);
  }
});
test('entry point: `node server.js` khởi động và in bảng routing', async () => {
  const child = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PROXY_PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    stdout += chunk;
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });

  const waitForLog = new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Không thấy log listening. stdout=${stdout} stderr=${stderr}`)),
      8000,
    );
    child.stdout.on('data', () => {
      // Chờ tới khi cả bảng routing đã được in (không chỉ dòng đầu tiên).
      if (stdout.includes('Dev proxy listening') && stdout.includes('backend API')) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Proxy thoát sớm (code ${code}). stderr=${stderr}`));
    });
  });

  try {
    await waitForLog;
    assert.match(stdout, /\/api\/\*\s+→ backend API/);
    assert.match(stdout, /\/admin\/\*\s+→ admin frontend/);
  } finally {
    child.kill('SIGTERM');
  }

  const code = await new Promise((resolve) => child.on('exit', resolve));
  assert.ok(code === 0 || code === null, `exit code không mong đợi: ${code}`);
});
