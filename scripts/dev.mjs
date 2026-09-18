#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Màu sắc ANSI cho console
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  magenta: '\x1b[35m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

const SERVICES = [
  {
    name: 'backend',
    color: colors.cyan,
    cwd: path.join(ROOT_DIR, 'okbong-backend'),
    cmd: 'npm',
    args: ['run', 'dev'],
    env: { ...process.env, PORT: '3000' },
  },
  {
    name: 'user',
    color: colors.green,
    cwd: path.join(ROOT_DIR, 'okbong-user-frontend'),
    cmd: 'npm',
    args: ['run', 'dev', '--', '-p', '3001'],
    env: { ...process.env, PORT: '3001' },
  },
  {
    name: 'admin',
    color: colors.magenta,
    cwd: path.join(ROOT_DIR, 'okbong-admin-frontend'),
    cmd: 'npm',
    args: ['run', 'dev'],
    env: { ...process.env, VITE_BASE_PATH: '/admin/' },
  },
  {
    name: 'proxy',
    color: colors.yellow,
    cwd: path.join(ROOT_DIR, 'proxy-layer'),
    cmd: 'npm',
    args: ['start'],
    env: { ...process.env, PROXY_PORT: '8080', USER_PORT: '3001', ADMIN_PORT: '5173', BACKEND_PORT: '3000' },
  },
];

console.log(`${colors.bold}${colors.blue}
================================================================
  NexTrading / OKBong — Khởi động toàn bộ Dev Services
================================================================${colors.reset}
  🚀 ${colors.bold}Cổng Proxy hợp nhất:${colors.reset}    ${colors.yellow}http://localhost:8080/${colors.reset}
     ├─ ${colors.green}User Frontend:${colors.reset}       http://localhost:8080/       ${colors.dim}(gốc: :3001)${colors.reset}
     ├─ ${colors.magenta}Admin Dashboard:${colors.reset}     http://localhost:8080/admin/ ${colors.dim}(gốc: :5173/admin/)${colors.reset}
     └─ ${colors.cyan}Backend API:${colors.reset}         http://localhost:8080/api/   ${colors.dim}(gốc: :3000)${colors.reset}
================================================================
${colors.dim}Nhấn Ctrl+C để dừng toàn bộ service.${colors.reset}
`);

const children = [];

function handleStream(stream, prefix, color, isError = false) {
  let buffer = '';
  stream.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop(); // giữ lại phần chưa hoàn thành
    for (const line of lines) {
      if (!line.trim()) continue;
      const target = isError ? process.stderr : process.stdout;
      target.write(`${color}[${prefix}]${colors.reset} ${line}\n`);
    }
  });
  stream.on('end', () => {
    if (buffer.trim()) {
      const target = isError ? process.stderr : process.stdout;
      target.write(`${color}[${prefix}]${colors.reset} ${buffer}\n`);
    }
  });
}

function startService(service) {
  const child = spawn(service.cmd, service.args, {
    cwd: service.cwd,
    env: service.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: process.platform !== 'win32',
  });

  children.push(child);

  handleStream(child.stdout, service.name, service.color, false);
  handleStream(child.stderr, service.name, service.color, true);

  child.on('exit', (code, signal) => {
    if (signal) {
      console.log(`${service.color}[${service.name}]${colors.reset} dừng bởi signal: ${signal}`);
    } else if (code !== 0 && code !== null) {
      console.error(`${service.color}[${service.name}]${colors.reset} thoát với mã lỗi: ${code}`);
    }
  });
}

for (const service of SERVICES) {
  startService(service);
}

let isTerminating = false;
function shutdown() {
  if (isTerminating) return;
  isTerminating = true;
  console.log(`\n${colors.yellow}Đang dừng toàn bộ services...${colors.reset}`);

  for (const child of children) {
    try {
      if (process.platform !== 'win32' && child.pid) {
        process.kill(-child.pid, 'SIGTERM');
      } else {
        child.kill('SIGTERM');
      }
    } catch {
      // bỏ qua lỗi process đã thoát
    }
  }

  // Force exit sau 3 giây nếu còn tiến trình treo
  setTimeout(() => {
    for (const child of children) {
      try {
        if (process.platform !== 'win32' && child.pid) {
          process.kill(-child.pid, 'SIGKILL');
        } else {
          child.kill('SIGKILL');
        }
      } catch {
        // bỏ qua
      }
    }
    process.exit(0);
  }, 3000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('exit', shutdown);
