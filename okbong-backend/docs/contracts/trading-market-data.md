# Contract: Trading Market Data (`/price/markets`)

**Trạng thái:** chốt ngày 2026-09-17 — mọi công cụ (Cline, Opencode, Hermes, người)
**MUST** tuân theo tài liệu này. Đổi shape = phải sửa file này trước.

## Nguồn dữ liệu

| Nguồn | Vai trò | Ghi chú |
|---|---|---|
| CoinGecko `/coins/markets` | nguồn chính | trả giá VND, logo `image`, `price_change_percentage_24h`, `sparkline_in_7d.price` |
| Binance `/api/v3/ticker/24hr` | dự phòng (tuỳ chọn) | chỉ USDT, dùng khi CoinGecko lỗi |
| Cache in-memory của backend | giảm tải | TTL mặc định 30s |

Backend **NEVER** bịa giá. Không có dữ liệu ⇒ trả lỗi chuẩn của
`AllExceptionsFilter`, không trả số giả.

## Endpoint

```
GET /price/markets?vs=vnd&ids=bitcoin,ethereum,tether,solana,dogecoin,zcash
```

- **Không cần JWT** (giống `/price/current`, `/price/history`).
- `vs` (tuỳ chọn, mặc định `vnd`): chỉ hỗ trợ `vnd` | `usd`.
- `ids` (tuỳ chọn): danh sách id CoinGecko, phân tách bằng dấu phẩy. Mặc định lấy
  từ biến môi trường `MARKET_COIN_IDS`.

### Response 200 — mảng `MarketCoinDto[]`

```jsonc
[
  {
    "id": "bitcoin",                       // id CoinGecko
    "symbol": "BTC",                       // UPPERCASE
    "name": "Bitcoin",
    "image": "https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png?1696501400",
    "price": 1985259449,                   // giá theo `vs` (VND)
    "currency": "VND",
    "change24h": 0.09551,                  // phần trăm, có thể âm
    "volume24h": 760868602834255,          // có thể null
    "marketCap": 39827152756985760,        // có thể null
    "sparkline": [1955032847, 1967...],    // ~168 điểm giá 7 ngày, cùng đơn vị `vs`; [] nếu không có
    "updatedAt": "2026-09-17T11:58:00.000Z",
    "stale": false                         // true khi trả cache cũ do nguồn lỗi
  }
]
```

Header bổ sung:

| Header | Giá trị | Ý nghĩa |
|---|---|---|
| `X-Market-Source` | `coingecko` \| `cache` | nguồn thực tế đã dùng |
| `X-Market-Cached` | `true` \| `false` | có phải đọc từ cache |
| `X-Market-Updated-At` | ISO-8601 | thời điểm dữ liệu được lấy từ nguồn |

### Lỗi

| Mã | Khi nào |
|---|---|
| `400` | `vs` ngoài `vnd`/`usd`, hoặc `ids` chứa ký tự không hợp lệ |
| `503` | nguồn ngoài lỗi/timeout **và** cache rỗng (body theo `AllExceptionsFilter`) |

## Ràng buộc triển khai (backend)

- `fetch` của Node (>= 20), `AbortSignal.timeout(8000)`; không thêm dependency HTTP.
- Cache in-memory + dedupe request đang bay (một request mạng cho N client đồng thời).
- TTL: `MARKET_CACHE_TTL_MS` (mặc định `30000`).
- Base URL: `MARKET_API_BASE` (mặc định `https://api.coingecko.com/api/v3`).
- Nguồn lỗi nhưng còn cache ⇒ trả cache cũ, `stale: true`, HTTP 200.
- `PriceTickerService` giả lập **MUST NOT** ghi đè giá của các symbol có dữ liệu thật;
  ticker chỉ còn phục vụ symbol nội bộ (`BDSD`).
- **Quy đổi sparkline:** CoinGecko luôn trả `sparkline_in_7d.price` theo **USD** bất kể
  `vs_currency`. Backend chuẩn hoá tuyến tính để điểm cuối của sparkline bằng `price`
  (`scale = price / sparkline[last]`), nhờ đó sparkline luôn cùng đơn vị `currency` và
  giữ nguyên hình dạng xu hướng. Frontend không phải quy đổi.

## Kiểu dùng chung ở frontend

`okbong-user-frontend/src/lib/market/types.ts` — `MarketCoin` khớp 1-1 với DTO trên.
`okbong-user-frontend/src/lib/market/useMarketData.ts` — hook polling + trạng thái.
`okbong-user-frontend/src/lib/api/endpoints.ts` — `priceApi.markets()`.

## Kiểm chứng bắt buộc

```bash
curl -s "http://localhost:3000/price/markets?ids=bitcoin,ethereum" | jq '.[0]'
curl -sD- -o /dev/null "http://localhost:3000/price/markets" | grep -i x-market
```
