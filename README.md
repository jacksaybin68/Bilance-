# Bilance-

NexTrading / OKBong — nền tảng giao dịch P2P & crypto.

## Workspaces

| Thư mục | Stack | Port (dev) |
|---|---|---|
| `okbong-backend/` | NestJS 12 + TypeORM + BullMQ + Socket.IO | 3000 |
| `okbong-user-frontend/` | Next.js 16 App Router + Tailwind 4 | 3001 |
| `okbong-admin-frontend/` | Vite + React 19 + antd | 5173 |
| `proxy-layer/` | Express 5 + http-proxy — gom 3 service về 1 port | 8080 |

Ba workspace frontend/backend độc lập, không dùng chung `node_modules`.

## Chạy dev server (Khuyến nghị — 1 lệnh duy nhất)

Chạy đồng thời cả 4 thành phần (backend, user frontend, admin frontend và reverse proxy) gom về cổng `8080`:

```bash
npm run dev
```

Sau khi khởi động, truy cập toàn bộ hệ thống qua một điểm duy nhất:
- **User Frontend:** `http://localhost:8080/` (hoặc trực tiếp `:3001`)
- **Admin Dashboard:** `http://localhost:8080/admin/` (hoặc trực tiếp `:5173/admin/`)
- **Backend API:** `http://localhost:8080/api/` (hoặc trực tiếp `:3000`)

Các lệnh gom tiện ích từ thư mục gốc:
```bash
npm run test:all        # Chạy toàn bộ unit test của cả 4 workspace
npm run typecheck:all   # Typecheck toàn bộ backend và 2 frontend
npm run build:all       # Build toàn bộ các workspace
```

### Cách chạy thủ công từng service riêng lẻ (khi cần debug sâu)

```bash
# terminal 1..3: khởi động 3 service
cd okbong-backend && npm run dev
cd okbong-user-frontend && PORT=3001 npm run dev -- -p 3001
cd okbong-admin-frontend && VITE_BASE_PATH=/admin/ npm run dev

# terminal 4: điểm vào duy nhất
cd proxy-layer && npm start
```

Sau đó: `/` → user frontend, `/admin/*` → admin frontend, `/api/*` → backend API.
Xem `proxy-layer/README.md` để biết quy tắc rewrite path, biến môi trường override
port, và cách chạy smoke test (`cd proxy-layer && npm test`).

## Tài liệu thiết kế

- `okbong-backend/docs/adr/` — ADR (002 P2P matching, 007 KYC flow, 008 multi-asset market data).
- `okbong-backend/docs/contracts/trading-market-data.md` — contract `GET /price/markets`.
