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

## Chạy dev kèm reverse proxy

```bash
# terminal 1..3: khởi động 3 service
cd okbong-backend && npm run start:dev
cd okbong-user-frontend && npm run dev
cd okbong-admin-frontend && VITE_BASE_PATH=/admin/ npm run dev

# terminal 4: một điểm vào duy nhất
cd proxy-layer && npm install && npm start
```

Sau đó: `/` → user frontend, `/admin/*` → admin frontend, `/api/*` → backend API.
Xem `proxy-layer/README.md` để biết quy tắc rewrite path, biến môi trường override
port, và cách chạy smoke test (`cd proxy-layer && npm test`).

## Tài liệu thiết kế

- `okbong-backend/docs/adr/` — ADR (002 P2P matching, 007 KYC flow, 008 multi-asset market data).
- `okbong-backend/docs/contracts/trading-market-data.md` — contract `GET /price/markets`.
