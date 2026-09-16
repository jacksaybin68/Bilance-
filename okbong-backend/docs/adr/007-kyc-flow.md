# ADR 007: KYC Flow Architecture

**Status:** Accepted  
**Date:** 2026-09-16  
**Deciders:** Backend team  
**Supersedes:** —  

---

## Context

NexTrading requires identity verification (KYC) for users before they can access
regulated features (e.g. withdrawals above threshold, fiat on-ramp). The KYC
module must:

1. Accept document images (front, back, selfie) plus ID number from the user.
2. Store submissions with a lifecycle of statuses.
3. Allow admins to review and approve/reject, optionally with a rejection
   reason.
4. Notify the user asynchronously when their KYC is approved or rejected.
5. Be guardable: only admins/super admins can review; users can only view their
   own status.

## Decision

### 1. Status lifecycle

```
PENDING ──► UNDER_REVIEW ──► APPROVED
                      └──► REJECTED
```

- User submission → `PENDING`.
- Admin picks up → `UNDER_REVIEW` (optional, set by admin when they start
  reviewing).
- Admin decision → `APPROVED` or `REJECTED`.
- `EXPIRED` exists on the enum for future auto-expiry policy (e.g. pending
  submissions older than N days) but is **not** enforced in the initial
  implementation.

Transitions are validated in `KycService.updateStatus`: only `PENDING` or
`UNDER_REVIEW` may be updated. Once `APPROVED`/`REJECTED`/`EXPIRED`, the
submission is immutable via this endpoint.

### 2. Image handling (validation gap)

Images are stored as URLs or base64 strings in `VARCHAR` columns. To close the
validation gap:

- **Type:** `frontImage`, `backImage`, `selfieImage` must match a whitelist of
  MIME prefixes or extensions (`image/jpeg`, `image/png`, `image/webp`).
  Validation is applied at the DTO / service boundary before persistence.
- **Size:** practical ceiling of 5 MB per image for base64 payloads; URLs are
  accepted as-is but flagged for later enforcement at upload time.
- Invalid images throw `BadRequestException` with a clear field-level error.

This is implemented in `KycService.validateImage()` and called from
`KycService.create()`.

### 3. Async notification

When an admin sets `APPROVED` or `REJECTED`, the service pushes a
`kyc.approval` job to the app queue (BullMQ when Redis is available, in-memory
fallback otherwise). The job payload contains:

- `kycId`, `userId`, `status`, `rejectReason?` — enough for a notification
  worker to send email / in-app alert.

Queue integration uses `QueueService` from `src/queue/`, registered as a
provider in `KYCModule`.

### 4. Admin dashboard support

A new endpoint `GET /kyc/pending-count` returns the count of submissions in
`PENDING` and `UNDER_REVIEW` statuses. This is used by the admin dashboard to
display the review backlog without pulling the full list.

Only `ADMIN` / `SUPER_ADMIN` may call it.

### 5. Module wiring

`KYCModule` imports `TypeOrmModule.forFeature([KycEntity])`, `forwardRef(() => UserModule)`,
and now also `QueueModule`. `QueueService` is injected into `KycService`.

## Consequences

### Positive

- Clear, enforceable lifecycle; illegal transitions are rejected early.
- Image validation prevents garbage (non-images, oversized payloads) from
  entering the DB.
- Async notification decouples review action from email delivery; no blocking
  on SMTP.
- `pending-count` gives admins a cheap backlog metric.

### Negative / risks

- Image validation on base64 strings is a soft guard; a future upload service
  (S3 / Cloudinary) should enforce type+sizing at the edge and store only
  URLs.
- In-memory queue loses jobs across restarts — acceptable for dev, not for
  production. Production must run Redis.
- `reviewedBy` is currently a placeholder (`'system'`) in the controller; the
  TODO should be resolved by injecting the authenticated admin's ID from the
  JWT guard.

### Compliance & follow-up

- Consider auto-expiry of `PENDING` submissions after a configurable SLA
  (uses `KYCStatus.EXPIRED`).
- Consider rate limiting KYC submissions per user.
- Consider audit logging for approval/rejection actions (who, when, why).

## Alternatives considered

- **Synchronous email from the controller:** rejected — blocks the admin UI and
  couples HTTP request lifetime to SMTP.
- **Dedicated `KycQueueService`:** rejected in favor of reusing the existing
  `QueueService` abstraction to keep queue infrastructure consolidated.
- **Storing images as BLOBs:** rejected — URL/base64 strings keep the entity
  light and defer the storage decision to an upload service.

---

## References

- `src/kyc/kyc.service.ts`
- `src/kyc/kyc.controller.ts`
- `src/kyc/entities/kyc.entity.ts`
- `src/kyc/dto/kyc.dto.ts`
- `src/queue/queue.service.ts` — shared BullMQ / in-memory queue abstraction
- `src/queue/bill.queue.service.ts` — existing queue job pattern to follow
