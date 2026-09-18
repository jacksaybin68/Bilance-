# ADR 008: Multi-Asset Market Data (crypto, equity, forex, bond, commodity, index)

**Status:** Accepted
**Date:** 2026-09-18
**Deciders:** Backend team
**Supersedes:** —
**Extends:** `docs/contracts/trading-market-data.md`

---

## Context

NexTrading currently exposes a single market feed: crypto spot prices from
CoinGecko, served by `GET /price/markets` (`MarketDataService`, module
`src/pricefluctuation/`). The `MarketCoinDto` shape, the in-memory cache with
in-flight de-duplication, the `stale` flag and the `X-Market-*` headers are
already contractually frozen in `docs/contracts/trading-market-data.md`.

Product now needs the same market screen to cover more than crypto:

1. **Cổ phiếu (equities)** — e.g. `AAPL`, `VCB.VN`.
2. **Tiền điện tử (crypto)** — existing CoinGecko feed, must keep working unchanged.
3. **Ngoại hối (FX)** — e.g. `EURUSD=X`, `USDVND=X`.
4. **Trái phiếu (bonds)** — yields and bond ETFs, e.g. `^TNX` (US 10Y yield), `TLT`.
5. Commodities and indices are the natural next step (`GC=F`, `^GSPC`).

Constraints that shape the decision:

- **Backend NEVER fabricates prices** (existing contract rule). Unknown/absent data must
  fail loudly (`503`) or omit fields (`null`) — never invent a number.
- The user frontend's `MarketCoin` type mirrors the DTO 1-1; adding fields must be
  additive, and the existing request `GET /price/markets?ids=bitcoin&vs=vnd` must keep
  returning the same payload for existing callers.
- No new HTTP dependency (Node 20+ `fetch` only), no API keys required to run dev.

## Egress verification — re-verified 2026-09-18 (this machine, curl)

Kết quả dưới đây là **đo lại thực tế** trên egress dev hiện tại, không kế thừa ghi chú cũ.
Điểm khác biệt quan trọng so với lần khảo sát trước: **Yahoo trả `429` trên `query1`
ngay cả khi đã gửi browser `User-Agent`**, nhưng `200` trên `query2`.

| Nguồn | Lệnh kiểm chứng (rút gọn) | Kết quả |
|---|---|---|
| CoinGecko crypto | `GET api.coingecko.com/api/v3/coins/markets?vs_currency=vnd&ids=bitcoin` | `200` |
| Yahoo chart — `query1` không UA | `GET query1.finance.yahoo.com/v8/finance/chart/AAPL` | `429` |
| Yahoo chart — `query1` + browser UA | same + `User-Agent: Mozilla/5.0 …` | `429` |
| Yahoo chart — `query2` + browser UA | `GET query2.finance.yahoo.com/v8/finance/chart/AAPL` | `200` |
| Yahoo — equity US | `query2 … /chart/AAPL` | `200` |
| Yahoo — equity VN | `query2 … /chart/VCB.VN` | `200` |
| Yahoo — FX | `query2 … /chart/USDVND=X` | `200` |
| Yahoo — bond yield | `query2 … /chart/^TNX` | `200` |
| Yahoo — commodity | `query2 … /chart/GC=F` | `200` |
| Yahoo — index | `query2 … /chart/^GSPC` | `200` |
| Stooq CSV | `GET stooq.com/q/l/?s=aapl.us&f=sd2t2ohlcv&h&e=csv` | `404` |
| FRED (không key) | `GET api.stlouisfed.org/fred/series/observations?series_id=DGS10` | `400` |
| Frankfurter (ECB FX) | `GET api.frankfurter.dev/v1/latest?base=USD&symbols=VND,EUR` | `200` nhưng **không có `VND`** (chỉ trả `EUR`) |
| US Treasury fiscaldata | `GET api.fiscaldata.treasury.gov/…/avg_interest_rates` | `200` |
| CoinCap | `GET api.coincap.io/v2/assets` | không truy cập được từ egress (curl exit 6) |

Metadata Yahoo chart đã kiểm chứng đủ để map sang DTO (ví dụ `AAPL`):
`meta.symbol`, `meta.currency`, `meta.exchangeName`, `meta.instrumentType`,
`meta.regularMarketPrice`, `meta.chartPreviousClose`, `timestamp[]`, `indicators.quote[].close[]`.

## Decision

### D1 — Một endpoint, mở rộng theo kiểu additive

Giữ `GET /price/markets` làm entrypoint duy nhất và thêm **2 query param optional**:

```
GET /price/markets?assetClass=crypto&ids=bitcoin,ethereum&vs=vnd   # hành vi hiện tại
GET /price/markets?assetClass=equity&symbols=AAPL,VCB.VN&vs=usd     # mới
GET /price/markets?assetClass=fx&symbols=USDVND=X&vs=vnd            # mới
```

- `assetClass` ∈ `crypto | equity | fx | bond | commodity | index`, **mặc định `crypto`**.
- `assetClass=crypto` (hoặc không truyền) → payload, header, mã lỗi **giống hệt** hôm nay.
- `symbols` chỉ dùng cho asset class không phải crypto; `ids` giữ nguyên ý nghĩa CoinGecko id.
- Truyền `symbols` cùng `crypto`, hoặc `assetClass` không hợp lệ → `400`.

### D2 — Provider registry thay vì if/else trong service

Tách interface `MarketDataProvider` (`assetClass`, `fetch(symbols, vs)` → `MarketFetchResult`)
và đăng ký theo `assetClass`; `MarketDataService` trở thành orchestrator: validate → chọn
provider → cache/dedupe in-flight → stale fallback → `503`. Không provider nào tự set HTTP
status; luật lỗi nằm ở một chỗ để không phân kỳ giữa các asset class.
### D3 — Nguồn dữ liệu theo asset class

| `assetClass` | Nguồn | Ghi chú bắt buộc |
|---|---|---|
| `crypto` | CoinGecko `/coins/markets` | **Không đổi** so với hôm nay (`MARKET_API_BASE`, `MARKET_API_KEY` optional) |
| `equity`, `fx`, `bond`, `commodity`, `index` | Yahoo Finance `/v8/finance/chart/{symbol}` trên host **`query2.finance.yahoo.com`** | Bắt buộc gửi browser `User-Agent` + `Accept: application/json`; `AbortSignal.timeout` |

Lý do chọn Yahoo cho 5 asset class còn lại: đã kiểm chứng `200` cho cả 6 symbol đại diện
(equity US/VN, FX, bond yield, commodity, index) bằng **một** dạng request duy nhất — rẻ hơn
việc ghép nhiều nguồn rời rạc cho từng lớp tài sản.

### D4 — Mở rộng contract theo kiểu additive, không phá caller cũ

`MarketCoinDto` thêm field **optional** (caller cũ không thấy khác biệt):

| Field mới | Kiểu | Ý nghĩa |
|---|---|---|
| `assetClass` | `'crypto' \| 'equity' \| 'fx' \| 'bond' \| 'commodity' \| 'index'` | mặc định `'crypto'` khi vắng |
| `exchange` | `string \| null` | `meta.exchangeName` (Yahoo); `null` với crypto |
| `previousClose` | `number \| null` | `meta.chartPreviousClose` — cơ sở để tính `change24h` mà không bịa số |

Header `X-Market-Source` mở rộng giá trị: `coingecko | yahoo | cache` (giữ `cache` như cũ).
Frontend `MarketSource` (`okbong-user-frontend/src/lib/market/types.ts`) thêm `'yahoo'`.
`MarketQueryDto` thêm `assetClass` + `symbols` (`symbols` validate `^[A-Za-z0-9.,=^-]+$`).

### D5 — Không bịa giá (áp dụng chặt hơn cho asset class mới)

- Entry thiếu giá (`regularMarketPrice` null/không parse được, hoặc CoinGecko `current_price` null)
  → **loại khỏi mảng kết quả** + log `warn`; **không bao giờ** dùng `0` làm giá.
- Kết quả rỗng và không có cache → `503` (như hiện tại). Còn cache → trả cache, `stale: true`, `200`.
- `change24h` chỉ được tính khi có cả giá hiện tại **và** `previousClose`; thiếu một trong hai
  → `null`, không suy diễn.
- **Không quy đổi chéo tiền tệ** trong ADR này: muốn hiển thị VND cho tài sản niêm yết USD
  phải có nguồn tỷ giá riêng được chốt (xem D7) — backend không tự nhân tỷ giá.
- Ghi chú tương thích: code hiện tại của crypto dùng `current_price ?? 0`; giữ nguyên để không
  phá contract đã chốt. Việc siết crypto về cùng luật D5 là issue refactor riêng, không thuộc ADR này.

### D6 — Rate limit, cache và cooldown

- Cache key tách theo provider: `provider:assetClass:vs:symbols` (tránh đụng độ với key crypto cũ).
- TTL tối thiểu: `crypto` = `MARKET_CACHE_TTL_MS` (30s như hiện tại); Yahoo-backed = **≥ 60s**
  (`MARKET_YAHOO_CACHE_TTL_MS`, mặc định 60_000) vì nguồn không có SLA.
- Phân tán host `query1`/`query2` khi gặp `429`; sau `N` lần `429` liên tiếp → cooldown 60s cho
  provider đó và phục vụ cache stale; **không** retry storm.
- Dedupe in-flight request được giữ nguyên cho mọi asset class.

### D7 — Ngoài phạm vi ADR này

- Quy đổi VND cho tài sản niêm yết USD (cần ADR riêng + nguồn tỷ giá được chốt; Frankfurter/ECB
  đã kiểm chứng **không có VND**).
- Đặt lệnh/khớp lệnh cho tài sản ngoài crypto (thuộc ADR 002 — P2P matching engine).
- Lưu lịch sử giá ngoài crypto vào DB (bảng `price_history` hiện chỉ phục vụ symbol nội bộ).

### D8 — Không thêm dependency, không cần API key để chạy dev

Chỉ dùng `fetch` của Node ≥ 20 (đã là yêu cầu hiện tại của backend). Không thêm thư viện HTTP,
không thêm SDK. Toàn bộ provider phải chạy được `npm run start:dev` **không có key**; key chỉ là
env optional để tăng quota (ví dụ `MARKET_API_KEY` cho CoinGecko demo).

## Alternatives considered

| Phương án | Kết quả | Lý do |
|---|---|---|
| **Stooq CSV** cho equity/FX | Loại | `404` từ egress này (cùng kết quả với lần khảo sát trước) |
| **FRED** cho bond yield | Loại (ở giai đoạn này) | `400` khi thiếu `api_key`; vi phạm ràng buộc "dev không cần key". Có thể thêm sau như provider optional khi có key |
| **Frankfurter (ECB)** cho FX | Loại làm nguồn chính | `200` nhưng **không có VND** → không đủ cho cặp `USDVND` mà sản phẩm cần |
| **CoinCap** cho crypto | Loại | Không truy cập được từ egress (DNS/curl exit 6) |
| **Yahoo `query1`** | Loại | `429` cả khi đã gửi browser `User-Agent` trong egress này |
| **Aggregator trả phí** (Alpha Vantage / Polygon / Finnhub / IEX) | Hoãn | Cần key + quota + hợp đồng; là đường nâng cấp khi cần SLA. Kiến trúc provider registry làm việc này chỉ còn là "thêm 1 provider" |
| **Endpoint riêng cho từng asset class** (`/price/equities`, `/price/fx`, …) | Loại | Nhân đôi contract, validator, header và type ở frontend; thêm query param additive rẻ hơn và giữ một nguồn sự thật |
| **Backend tự quy đổi FX để hiển thị VND cho mọi tài sản** | Loại (thuộc ADR khác) | Cần nguồn tỷ giá được chốt + quy tắc làm tròn; làm ẩu sẽ vi phạm luật "không bịa giá" |
| **Scrape HTML/không chính thức tự viết** | Loại | Giòn, vi phạm tinh thần "không bịa", khó test |

## Consequences

**Tích cực**

- Một endpoint, một DTO, một luật lỗi cho mọi asset class; caller crypto hiện tại không phải sửa gì.
- Thêm asset class = thêm 1 provider + 1 dòng registry, không đụng controller/frontend type.
- Luật "không bịa giá" được phát biểu rõ và kiểm chứng được bằng test (loại entry thiếu giá, `503` khi hết cache).

**Tiêu cực / rủi ro**

- **Phụ thuộc Yahoo Finance** — API không chính thức, không SLA, có ToS riêng, schema có thể đổi,
  và `429` theo edge (đã quan sát: cùng request, `query1` `429` / `query2` `200`). Giảm thiểu:
  TTL ≥ 60s, phân tán host, cooldown, luôn có đường trả cache `stale`, và giữ provider registry
  để chuyển sang nguồn có SLA mà không đổi contract.
- `X-Market-Source` thêm giá trị `yahoo` → mọi consumer đang parse cứng union sẽ phải cập nhật;
  frontend hiện đã có fallback (`'fallback'`) nên chỉ cần thêm `'yahoo'`.
- DTO thay đổi phải đồng bộ **3 nơi**: `MarketCoinDto` (backend), `MarketCoin` (frontend),
  `docs/contracts/trading-market-data.md` — lệch một nơi là vỡ contract.
- Dữ liệu phi crypto có múi giờ/phiên giao dịch (equity đóng cửa cuối tuần) → `stale`/`updatedAt`
  sẽ khác crypto; tài liệu hoá để tránh hiểu sai là "lỗi".

**Trung tính**

## Rollout

| Giai đoạn | Nội dung | Điều kiện hoàn thành |
|---|---|---|
| P1 | Thêm `assetClass` + `symbols` vào `MarketQueryDto`, provider registry, bọc CoinGecko thành `CryptoProvider` | Request cũ trả payload **byte-for-byte** như trước; test contract cũ vẫn xanh |
| P2 | `YahooProvider` cho `equity` + `fx` (AAPL, VCB.VN, USDVND=X) | `curl` trả `200` + `X-Market-Source: yahoo`; test 429 → `stale` khi có cache |
| P3 | Mở `bond`, `commodity`, `index` (`^TNX`, `GC=F`, `^GSPC`) | Provider dùng chung mapping, không code riêng theo symbol |
| P4 | Frontend: `MarketSource` thêm `'yahoo'`, `/market` hiển thị nhóm theo `assetClass` | Typecheck + test frontend xanh |
| Sau | (ADR riêng) quy đổi VND, nguồn có SLA, lưu lịch sử giá phi crypto | — |

## Kiểm chứng bắt buộc

Trước khi merge P1 (không được đổi hành vi crypto):

```bash
curl -sD- -o /dev/null "http://localhost:3000/price/markets" | grep -i x-market
curl -s "http://localhost:3000/price/markets?ids=bitcoin,ethereum" | jq '.[0]'
curl -s "http://localhost:3000/price/markets?assetClass=equity&symbols=AAPL" | jq '.[0]'
curl -s -o /dev/null -w '%{http_code}\n' "http://localhost:3000/price/markets?assetClass=crypto&symbols=AAPL"   # kỳ vọng 400
```

Các case test phải có (backend):

1. `assetClass` vắng → dùng provider crypto (không đổi payload, không đổi header).
2. `assetClass` sai giá trị, hoặc `symbols` cùng `crypto` → `400`.
3. Provider trả entry thiếu giá → entry bị loại, không có `price: 0` trong payload.
4. Provider lỗi/timeout + còn cache → `200`, `stale: true`, `X-Market-Source: cache`.
5. Provider lỗi + không cache → `503`.
6. `429` từ Yahoo → cooldown, request kế tiếp không gọi mạng lại ngay.
7. `symbols` nhiều mã → 1 request mạng (dedupe in-flight) cho nhiều client đồng thời.

Và kiểm chứng contract ở frontend: `MarketCoin` khớp field mới với `MarketCoinDto`
(cùng cách đã làm cho `trading-market-data.md` ngày 2026-09-18).

## Open questions

1. Yahoo không có SLA: khi nào chuyển sang aggregator trả phí, và ngân sách/key lấy ở đâu?
2. `change24h` cho equity nên theo phiên gần nhất hay 24 giờ trượt (hai định nghĩa cho kết quả khác nhau ngoài giờ giao dịch)?
3. Có cần hiển thị VND cho tài sản niêm yết USD ngay ở P2, hay chờ ADR nguồn tỷ giá?
4. TTL 60s cho Yahoo có đủ tránh `429` khi nhiều user đồng thời, hay cần cache chia sẻ (Redis) trong tương lai?

## Tham chiếu

- `docs/contracts/trading-market-data.md` — contract `GET /price/markets` (phải sửa file này TRƯỚC khi đổi shape).
- `src/pricefluctuation/market-data.service.ts` — orchestrator hiện tại (cache, dedupe, stale, `503`).
- `src/pricefluctuation/dto/market-coin.dto.ts` — `MarketCoinDto`, `MarketMetaDto`, `MarketQueryDto`.
- `okbong-user-frontend/src/lib/market/types.ts` — `MarketCoin`, `MarketSource`, `TRADABLE_SYMBOLS`.
- ADR 002 (P2P matching engine) — ngoài phạm vi giá; ADR 007 (KYC flow).
- Hành vi crypto không đổi (mặc định `assetClass=crypto`) → không cần migrate dữ liệu, không downtime.