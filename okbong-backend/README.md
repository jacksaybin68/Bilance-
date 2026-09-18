# NexTrading

## Services

| Service  | Port  | Notes                              |
|----------|-------|------------------------------------|
| API      | 3000  | NestJS + REST + WebSocket (Socket.IO) |
| Postgres | 5432  | Primary DB (auto‑created schema)   |
| Redis    | 6379  | BullMQ queue + Socket.IO adapter   |

## Run

```bash
docker compose up -d
# First boot: runs migrations via autoLoadEntities (dev only)
# Seed the DB:
docker compose exec api npm run seed
```

## Environment

Copy `.env.example` → `.env.local` and adjust:

```bash
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=okbong
REDIS_URL=redis://redis:6379
JWT_SECRET=replace-me
JWT_REFRESH_SECRET=replace-me
WEBHOOK_SECRET=replace-me
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
PORT=3000
NODE_ENV=development
```

## Development

```bash
# Backend
cd okbong-backend && npm run dev

# Frontend (separate terminal)
cd okbong-admin-frontend && npm run dev
```

## Auth Flow

### Login (2FA aware)

```
POST /auth/login
{ "email": "...", "password": "..." }
```

- Không có 2FA → trả `{ accessToken, refreshToken, expiresIn }` ngay.
- Có 2FA đã kích hoạt HOẶC pending setup → trả:
  ```json
  { "requires2FA": true, "sessionId": "otp-...", "pendingSetup": false }
  ```
  `pendingSetup: true` khi user có `twoFactorSecret` nhưng chưa kích hoạt (`twoFactorEnabled=false`).

### Hoàn tất 2FA

```
POST /auth/2fa/verify
{ "sessionId": "otp-...", "token": "123456" }
```

- Không cần JWT — `sessionId` là cách xác thực duy nhất.
- Nếu TOTP hợp lệ → trả cặp token (giống login thông thường).
- Nếu user đang pending setup → tự động kích hoạt 2FA (`twoFactorEnabled=true`).
- Session OTP có TTL 5 phút; hết hạn phải đăng nhập lại.

### Khởi tạo / tắt 2FA (cần đã login)

```
POST /auth/2fa/setup          →  { secret, otpauthUrl }   (QR code)
POST /auth/2fa/enable         →  { token, secret? }       →  bật 2FA
POST /auth/2fa/disable        →  { token }                →  tắt 2FA, xóa secret
```

### Tổng quan

| Bước | Endpoint | Cần auth? | Mô tả |
|------|----------|-----------|-------|
| 1 | `POST /auth/login` | Không | Đăng nhập → token hoặc requires2FA+sessionId |
| 2 | `POST /auth/2fa/verify` | Không (dùng sessionId) | Gửi mã TOTP → nhận token |
| 3a | `POST /auth/2fa/setup` | JWT | Lấy secret + QR để quét |
| 3b | `POST /auth/2fa/enable` | JWT | Verify mã → kích hoạt 2FA |
| 4 | `POST /auth/2fa/disable` | JWT | Verify mã → tắt 2FA |

### Luồng pending setup

Khi quản trị viên (hoặc một cơ chế khác) đặt `twoFactorSecret` cho user mà chưa bật `twoFactorEnabled`:

1. User login bình thường → `validateUser` phát hiện `twoFactorSecret && !twoFactorEnabled` → `requires2FA=true`, `pendingSetup=true`.
2. Client nhận `sessionId`, yêu cầu người dùng nhập mã TOTP (từ app Authenticator đã cài secret ở bước 3a).
3. `POST /auth/2fa/verify` với `sessionId` + `token` → xác thực thành công → tự động `enableTwoFactor` → trả token.
4. Từ此 sau, user login lại → `requires2FA=true`, `pendingSetup=false` (đã kích hoạt).
