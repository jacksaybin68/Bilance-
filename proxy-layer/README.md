# proxy-layer — dev reverse proxy

Gom 3 service dev cục bộ về **một port duy nhất** để test luồng thật qua cùng origin
(cookie, CORS, WS/HMR) mà không cần đổi cấu hình frontend.

```
http://localhost:8080/          → user frontend   (Next.js  :3001)
http://localhost:8080/admin/*   → admin frontend  (Vite     :5173)
http://localhost:8080/api/*     → backend API     (NestJS   :3000)
```

## Chạy

```bash
cd proxy-layer
npm install         # express + http-proxy
npm start           # node server.js
npm test            # smoke test (node --test)
```

Port override bằng biến môi trường (mặc định trong ngoặc):

| Biến | Ý nghĩa | Mặc định |
|---|---|---|
| `PROXY_PORT` | port điểm vào duy nhất | `8080` |
| `USER_PORT` | Next.js user app | `3001` |
| `ADMIN_PORT` | Vite admin app | `5173` |
| `BACKEND_PORT` | NestJS API | `3000` |

```bash
PROXY_PORT=9090 BACKEND_PORT=3000 npm start
```

Giá trị không phải số hợp lệ sẽ bị bỏ qua và dùng mặc định (xem `readPorts`).

## Quy tắc rewrite path

| Request vào proxy | Service nhận | Ghi chú |
|---|---|---|
| `/api/price/markets?ids=bitcoin` | backend: `/price/markets?ids=bitcoin` | Cắt `/api` vì backend không có global prefix |
| `/api` | backend: `/` | Cắt `/api` |
| `/admin/assets/index.js` | admin: `/admin/assets/index.js` | Giữ nguyên prefix để khớp `VITE_BASE_PATH=/admin/` |
| `/admin` | admin: `/admin` | Giữ nguyên prefix |
| `/market?q=1` | user: `/market?q=1` | Giữ nguyên path |
| `/apifoo` | user: `/apifoo` | Không cắt nhầm thành `/foo` |

WebSocket/HMR (`upgrade`): `/api/socket.io/...` → cắt `/api/` gửi backend `/socket.io/...`;
`/admin/*` → giữ nguyên `/admin/*` gửi admin Vite HMR; còn lại → user frontend Next.js.

## Vì sao không dùng `pathRewrite`

`http-proxy@1.18.1` **không** hỗ trợ option `pathRewrite` (chỉ
`http-proxy-middleware` mới có) — truyền vào sẽ bị bỏ qua im lặng. Vì vậy proxy này
tự cắt prefix từ `req.originalUrl` bằng `stripPrefix()`. Cách này áp dụng được cả cho
nhánh WebSocket upgrade, vốn **không** đi qua Express router nên `req.url` vẫn còn
`/api/...` — nếu chỉ dựa vào hành vi strip prefix của Express thì WS sẽ forward sai.

Ngoài ra Express 5 (path-to-regexp 8) không còn nhận `app.all('*')` hay `'/api/*'`
(throw `Missing parameter name`), nên server chỉ dùng `app.use(path, handler)`.

## Yêu cầu cấu hình phía admin frontend

Route `/admin/*` cắt prefix trước khi forward, nên Vite phải serve với base khớp:

```bash
# okbong-admin-frontend
VITE_BASE_PATH=/admin/ npm run dev
```

Không đặt sẽ khiến HTML sinh ra tham chiếu asset tuyệt đối `/assets/*`, các request
này rơi vào route mặc định và bị đẩy sang **user frontend**.

## Kiểm chứng

`npm test` chạy `node --test test/` với 3 mock service (backend/admin/user) trên port
ngẫu nhiên — không cần Postgres/Redis hay service thật. Bộ test cover:

- routing + cắt prefix cho `/api`, `/admin`, và fallback user frontend;
- giữ nguyên query string, body POST, header tuỳ biến;
- không cắt nhầm `/apifoo`;
- WS upgrade cắt prefix đúng cho `/api/*`;
- backend down → trả `502 Bad Gateway` thay vì treo;
- đơn vị: `stripPrefix`, `matchRoute`, `readPorts`, `ENV_KEYS`;
- entry point CLI: `node server.js` khởi động và in bảng routing.

Kiểm tra thủ công khi cả 3 service đã chạy:

```bash
curl -s "http://localhost:8080/api/price/markets?ids=bitcoin" | head -c 200
curl -sD- -o /dev/null "http://localhost:8080/admin/" | head -1
curl -sD- -o /dev/null "http://localhost:8080/" | head -1
```
