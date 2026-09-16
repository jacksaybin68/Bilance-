# ADR 002: P2P Matching Engine Design

**Status:** Accepted  
**Date:** 2026-09-16  
**Deciders:** Backend team  
**Supersedes:** —

---

## Context

NexTrading is a P2P (peer-to-peer) trading platform where users post buy/sell orders for cryptocurrency at a negotiated price. The backend must match compatible orders (buy ↔ sell, same pair, overlapping price) and record the resulting trades. Key requirements:

1. **Low latency for small volume.** Early-stage traffic is modest; users expect near-instant feedback when an order matches.
2. **Fair, deterministic matching.** When multiple orders could match the same counter-order, the system must pick one reproducibly (price-time priority).
3. **Real-time state propagation.** Frontends (user and admin) need live updates when orders are created, matched, cancelled, or completed.
4. **Persistence and auditability.** Every order and trade must be durably stored in PostgreSQL/SQLite, with a clear lifecycle so reconciliation and dispute resolution are possible.
5. **Extensibility.** The design should not preclude scaling to higher throughput or splitting the matching logic into a dedicated service later if needed.

Existing stack: NestJS 12, TypeORM, BullMQ (with in-memory fallback), Socket.IO, PostgreSQL/SQLite. There is already a `RealtimeModule` with a `PriceGateway` providing WebSocket pushes.

---

## Decision

### 1. Matching engine architecture: centralized (single process, in-memory matching loop)

We choose a **centralized** matching engine: a single Node.js process owns the matching loop, running in-memory over an in-process order book. Orders are persisted to the database for durability, but the live matching logic operates against an in-memory representation (or a tightly-scoped DB query with row-level locking — see Concurrency below).

**Rationale:**
- **Simplicity.** A single process means no distributed consensus, no cross-node race conditions, and a straightforward code path: receive order → check book → match → emit events → persist.
- **Low latency at low volume.** For the expected early traffic (tens to low hundreds of concurrent orders), an in-process loop is fast enough; there is no network hop between matcher and book.
- **Easier reasoning.** Debugging, testing, and replaying a single process is far simpler than a distributed one — important when money moves.

This is **not** a high-throughput market maker. It is a P2P desk where users post orders and the system matches when compatible orders appear. Centralized is acceptable until volume or latency requirements force a split.

### 2. Matching algorithm: price-time priority (FIFO)

Within the same price level, orders are matched in **first-in-first-out (FIFO)** order by submission time. The book is therefore a price-time priority order book:

- Buy side: highest price first; within equal price, earliest `createdAt` first.
- Sell side: lowest price first; within equal price, earliest `createdAt` first.

Matching proceeds by scanning for the best opposing price that crosses. When a match is found:
- The aggressor (new incoming order) may be partially or fully filled.
- `filledAmount` is updated on both the maker (existing book order) and the taker (incoming order).
- A `Trade` record is created for each fill (amount, price, maker, taker, timestamp).

If an incoming LIMIT order does not cross the book immediately, it rests on the book at its limit price until matched or cancelled.

### 3. Order lifecycle

```
PENDING ──► MATCHING ──► MATCHED (partial/full) ──► COMPLETED
   │              │                                    │
   │              │                                    └──► CANCELLED
   │              │
   │              └──► EXPIRED (if time-in-force policy is added later)
   │
   └──► CANCELLED (user-initiated before any fill)
```

- **PENDING:** Order accepted, durably stored, not yet processed by the matching loop.
- **MATCHING:** The matching loop has picked up the order and is evaluating it against the book. Used as a transient signal; in practice the order may move quickly to MATCHED or return to PENDING (if it rests unfilled as a limit order).
- **MATCHED:** At least one partial fill has occurred. The order remains active on the book / in the loop until `filledAmount === amount`, at which point it becomes COMPLETED.
- **COMPLETED:** Fully filled; no further action possible.
- **CANCELLED:** User or system cancelled the order before it was fully filled. Fills already executed are not reversed.
- **EXPIRED:** Reserved for future time-in-force (e.g. Good-Till-Time) expiry; not enforced in the initial implementation but the status constant exists.

State transitions are validated in service layer code; illegal transitions throw an error.

### 4. Data model: `OrderEntity`

```typescript
// src/orders/entities/order.entity.ts (conceptual)

@Entity('orders')
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;          // who placed the order

  @Column()
  pair: string;            // e.g. "BTC/USDT"

  @Column({
    type: 'enum',
    enum: OrderSide,
  })
  side: OrderSide;         // BUY | SELL

  @Column({
    type: 'enum',
    enum: OrderType,
  })
  type: OrderType;         // LIMIT | MARKET

  @Column('decimal', { precision: 20, scale: 8 })
  amount: number;          // total order size (remains constant)

  @Column('decimal', { precision: 20, scale: 8 })
  price: number;           // limit price (MARKET orders use 0 / null)

  @Column('decimal', { precision: 20, scale: 8 })
  filledAmount: number;    // cumulative filled quantity; 0 until first fill

  @Column({
    type: 'enum',
    enum: OrderStatus,
  })
  status: OrderStatus;     // PENDING | MATCHING | MATCHED | COMPLETED | CANCELLED | EXPIRED

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  updatedAt: Date;
}
```

Supporting enums:

```typescript
export enum OrderSide { BUY = 'BUY', SELL = 'SELL' }
export enum OrderType { LIMIT = 'LIMIT', MARKET = 'MARKET' }
export enum OrderStatus {
  PENDING = 'PENDING',
  MATCHING = 'MATCHING',
  MATCHED = 'MATCHED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}
```

A separate `TradeEntity` records each individual fill (aggressor order, passive order, price, amount, timestamp) for audit and settlement. The `OrderEntity.filledAmount` is the running total across all associated trades.

### 5. WebSocket events (Socket.IO)

The `MatchingGateway` (in `RealtimeModule` or a dedicated `OrdersModule`) emits the following events to relevant clients:

| Event               | Payload (summary)                                             | Recipients                    |
| ------------------- | ------------------------------------------------------------- | ----------------------------- |
| `order:created`     | `orderId`, `userId`, `pair`, `side`, `type`, `amount`, `price`, `status` | Order owner + subscribed admins |
| `order:matched`     | `orderId`, `tradeId?`, `matchedAmount`, `matchPrice`, `remainingAmount` | Both counterparties + admins  |
| `order:cancelled`   | `orderId`, `cancelledBy`, `finalStatus`                       | Order owner + admins          |
| `order:completed`   | `orderId`, `finalFilledAmount`, `totalTrades`                 | Order owner + admins          |

Event emission happens after the DB transaction commits (or after the in-memory state update + async persistence), so clients see a durable state, not a speculative one.

### 6. Concurrency

The matching loop is a **critical section**: two orders arriving nearly simultaneously must not both match the same resting order, and `filledAmount` updates must be atomic.

We use a combination:

- **DB transaction + row-level locking (`SELECT ... FOR UPDATE`)** on the order rows involved in a match. This ensures that two concurrent matching attempts cannot both read and update the same order. The transaction scope covers: read opposing orders → compute fills → update `filledAmount` on both sides → insert trade rows → commit.

- **BullMQ job for the async matching loop.** Incoming orders are enqueued as jobs (e.g. `matching.processOrder`) so that the matching loop runs as a queue consumer. This gives us:
  - Natural serialization of matching work through the queue (one job at a time per worker, or a small concurrency pool).
  - A backpressure path: if the matcher is busy, jobs queue in Redis rather than overwhelming the process.
  - An off-ramp to scale: add more workers later, or move the matcher to a dedicated service, without rewriting the dispatch path.

In the initial, low-volume implementation, the queue can run with the in-memory fallback (no Redis) — orders are still processed via the job mechanism, just without durable queue persistence across restarts. Once Redis is in place, the queue becomes durable and the matcher gains the ability to scale workers.

### 7. Trade-offs and future migration path

**Chosen: centralized, single-process matcher.**

| Aspect              | What we get now                                        | What we give up / accept                          |
| ------------------- | ------------------------------------------------------ | ------------------------------------------------- |
| Simplicity          | One process to deploy, test, debug. No distributed race conditions. | Single point of failure — if the process dies, in-flight matches may need recovery from DB state. |
| Latency             | In-memory matching + local DB is fast for small volume.   | Does not scale horizontally as-is; a single process is a throughput ceiling. |
| Determinism         | FIFO within price level is easy to implement and explain. | None — this is the standard for order books.      |
| Scalability         | BullMQ job queue gives a clean path to add workers or split the matcher later. | We do not get horizontal scale on day one; we rely on the queue to absorb bursts. |
| Durability          | Every order and trade is persisted via TypeORM before/after matching. | In-flight state (in-memory book) must be reconstructable from the DB for recovery; the initial implementation leans on the DB as the source of truth and rebuilds the book on startup. |

**Migration path if/when needed:**
1. Add more BullMQ workers consuming the same `matching.processOrder` queue — improves throughput with no code change to the matcher logic.
2. Extract the matching loop into a dedicated microservice (its own process, its own DB read replicas or a cache-backed book) — the post/order creation path stays in the main API, enqueueing jobs; the matcher service owns the book and emits events back via a shared queue or WebSocket.
3. Introduce a more robust book store (e.g. an in-memory LRU + periodic snapshot to DB, or Redis sorted sets) if read latency or recovery time becomes an issue.

For now, none of these are necessary. The centralized design is the simplest thing that satisfies the current requirements.

---

## Consequences

### Positive

- **Fast to implement and test.** A single in-process matcher with FIFO matching and a clear lifecycle is straightforward to write, unit-test, and integration-test.
- **Low latency for early users.** Orders are matched without distributed coordination; feedback is effectively immediate.
- **Durable and auditable.** Orders and trades live in PostgreSQL/SQLite with a well-defined status lifecycle, making reconciliation and dispute resolution possible.
- **Clear real-time signal.** Four WebSocket events cover the order lifecycle that frontends care about; the existing `PriceGateway` pattern is reused.
- **Scalable escape hatch.** The BullMQ job boundary means we can add workers or split the matcher later without redesigning the order submission path.

### Negative / risks

- **Single point of failure.** The matching process is stateful in memory; if it crashes, in-flight matches must be reconciled from DB state on restart (the DB is the durable source of truth, so recovery is possible but adds an operational step).
- **Throughput ceiling.** A single matcher process can only process so many orders per second. For the expected early volume this is acceptable, but it is a real limit to keep in mind.
- **DB row locking under contention.** `SELECT ... FOR UPDATE` serializes matching on contested orders; heavy contention could push latency up. Fine at low volume; worth monitoring.
- **Recovery complexity.** Rebuilding the in-memory order book from the DB on startup (for the in-memory book variant) requires careful handling of partially-filled orders and pending matches. The DB-as-source-of-truth variant (matching directly against DB rows with locking) avoids a separate book reconstruction step but may be slower. The initial implementation should pick one and document it.

### Compliance & follow-up

- Add a `TradeEntity` and the fill-aggregation logic for `OrderEntity.filledAmount`.
- Decide and document which concurrency variant is implemented first: in-memory book + DB persistence, or DB-row-based matching with locking.
- Add monitoring/alerting on matcher process health and queue depth.
- Consider time-in-force (GTT/FOK/IOC) as a future extension — `EXPIRED` status is already reserved.

---

## Alternatives considered

- **Decentralized / distributed matching (e.g. multiple matcher nodes with a shared book).** Rejected for now: adds distributed coordination (locking, consensus, or a shared state store) that is unnecessary at low volume and significantly increases complexity. The BullMQ queue already provides a clean path to multiple workers later without full decentralization.

- **Only in-DB matching (no in-memory book).** Considered as a simpler durability story. Viable, but for even modest volume the repeated DB reads for book state can become slow; the in-memory book (with DB as durability/recovery) is likely the better default. We can start with in-DB matching and graduate to an in-memory book if latency demands it.

- **Market-by-price only (no FIFO tie-break).** Rejected — without time priority, matching is non-deterministic when multiple orders sit at the same price, which is unacceptable for a financial ledger.

- **Push matching into PostgreSQL stored procedures / triggers.** Rejected — puts business logic in the DB layer, makes testing and evolution harder, and does not obviously improve latency for the expected load.

---

## References

- `src/orders/` — new OrdersModule (gateway, service, entity, dto)
- `src/realtime/realtime.module.ts` — existing `RealtimeModule` / `PriceGateway` pattern to follow for WebSocket emission
- `src/queue/queue.service.ts` — shared BullMQ / in-memory queue abstraction
- `src/queue/bill.queue.service.ts` — existing queue job pattern to follow
- `src/kyc/kyc.service.ts` — example of DB transaction + status-lifecycle validation
- ADR 007 (KYC Flow) — same template and team conventions
