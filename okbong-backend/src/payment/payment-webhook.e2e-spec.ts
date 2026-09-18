import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { BillStatus } from '../bill/dto/bill.dto';
import { BillEntity } from '../bill/entity/bill.entity';
import { PaymentWebhookController } from './payment-webhook.controller';
import { AppService } from '../app.service';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const BILL_ID = '00000000-0000-4000-a000-00000000aa01';
const OTHER_BILL_ID = '00000000-0000-4000-a000-00000000aa02';
const ADMIN_ID = '00000000-0000-4000-a000-00000000ad01';

type MockBillRepo = {
  findOneBy: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
};

function buildBill(overrides: Partial<BillEntity> = {}): BillEntity {
  return {
    id: BILL_ID,
    userId: '00000000-0000-4000-a000-0000000000a1',
    amount: 100000,
    type: 'payment',
    status: BillStatus.PENDING,
    description: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  } as BillEntity;
}

function makePayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    externalId: 'wp-' + Math.random().toString(36).slice(2, 10),
    billId: BILL_ID,
    amount: 100000,
    status: 'success',
    timestamp: new Date().toISOString(),
    signature: undefined,
    ...overrides,
  };
}

describe('PaymentWebhook E2E — Webhook từ provider', () => {
  let appAdmin: INestApplication;
  let appNoAuth: INestApplication;
  let billRepo: MockBillRepo;
  let billStore: Map<string, BillEntity>;

  const WEBHOOK_SECRET = 'okbong-test-webhook-secret';

  beforeAll(async () => {
    billStore = new Map<string, BillEntity>();

    billRepo = {
      findOneBy: vi.fn(async ({ id }: { id: string }) => {
        const found = billStore.get(id);
        return found ? { ...found } : null;
      }),
      save: vi.fn(async (entity: BillEntity) => {
        const clone = { ...entity, id: entity.id } as BillEntity;
        billStore.set(clone.id, clone);
        return { ...clone };
      }),
    };

    // ---- Provider app: public endpoint, gated only by the shared secret ----
    const paymentModule = await Test.createTestingModule({
      controllers: [PaymentWebhookController],
      providers: [
        AppService,
        { provide: getRepositoryToken(BillEntity), useValue: billRepo },
        {
          provide: ConfigService,
          useValue: { get: (key: string, def?: string) => (key === 'WEBHOOK_SECRET' ? WEBHOOK_SECRET : def) },
        },
      ],
    }).compile();

    appAdmin = paymentModule.createNestApplication();
    appAdmin.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, validationError: { target: false, value: false } }));
    await appAdmin.init();

    // ---- NoAuth app: same public controller without the secret header ----
    const noAuthModule = await Test.createTestingModule({
      controllers: [PaymentWebhookController],
      providers: [
        AppService,
        { provide: getRepositoryToken(BillEntity), useValue: billRepo },
        {
          provide: ConfigService,
          useValue: { get: (key: string, def?: string) => (key === 'WEBHOOK_SECRET' ? WEBHOOK_SECRET : def) },
        },
      ],
    }).compile();

    appNoAuth = noAuthModule.createNestApplication();
    appNoAuth.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, validationError: { target: false, value: false } }));
    await appNoAuth.init();
  });

  afterAll(async () => {
    await appAdmin.close();
    await appNoAuth.close();
  });

  beforeEach(() => {
    billStore.clear();
    vi.clearAllMocks();
    // Re-attach mock implementation sau clearAllMocks
    billRepo.findOneBy.mockImplementation(async ({ id }: { id: string }) => {
      const found = billStore.get(id);
      return found ? { ...found } : null;
    });
    billRepo.save.mockImplementation(async (entity: BillEntity) => {
      billStore.set(entity.id, entity);
      return { ...entity };
    });
  });

  // =========================================================================
  // Auth: secret validation
  // =========================================================================
  describe('Auth — WEBHOOK_SECRET', () => {
    it('401: không có header x-webhook-secret', async () => {
      await request(appAdmin.getHttpServer())
        .post('/payment-webhook')
        .send(makePayload())
        .expect(401);
    });

    it('401: secret sai', async () => {
      await request(appAdmin.getHttpServer())
        .post('/payment-webhook')
        .set('x-webhook-secret', 'wrong-secret')
        .send(makePayload())
        .expect(401);
    });

    it('200: secret đúng (không signature)', async () => {
      await request(appAdmin.getHttpServer())
        .post('/payment-webhook')
        .set('x-webhook-secret', WEBHOOK_SECRET)
        .send(makePayload({ billId: undefined }))
        .expect(200);
    });

    it('401: secret đúng nhưng thiếu ở app không cấu hình secret', async () => {
      await request(appNoAuth.getHttpServer())
        .post('/payment-webhook')
        .send(makePayload())
        .expect(401);
    });
  });

  // =========================================================================
  // Signature verification
  // =========================================================================
  describe('Signature verification', () => {
    it('400: signature không khớp', async () => {
      await request(appAdmin.getHttpServer())
        .post('/payment-webhook')
        .set('x-webhook-secret', WEBHOOK_SECRET)
        .set('x-webhook-signature', 'bad-sig')
        .send(makePayload())
        .expect(400);
    });

    it('200: bỏ qua kiểm tra signature khi provider không gửi header', async () => {
      // Việc tính signature khớp được cover ở unit test
      // (payment-webhook.controller.spec.ts) vì cần gọi trực tiếp AppService.
      await request(appAdmin.getHttpServer())
        .post('/payment-webhook')
        .set('x-webhook-secret', WEBHOOK_SECRET)
        .send(makePayload({ billId: undefined, signature: undefined }))
        .expect(200);
    });
  });

  // =========================================================================
  // POST /payment-webhook — success / paid có billId
  // =========================================================================
  describe('POST — success / paid (có billId)', () => {
    it('200: PENDING → PAID khi status=success', async () => {
      const bill = buildBill({ id: BILL_ID, status: BillStatus.PENDING });
      billStore.set(BILL_ID, bill);

      const res = await request(appAdmin.getHttpServer())
        .post('/payment-webhook')
        .set('x-webhook-secret', WEBHOOK_SECRET)
        .send(makePayload({ billId: BILL_ID, status: 'success' }))
        .expect(200);

      expect(res.body).toEqual({ received: true, processed: 'success' });
      expect(billRepo.findOneBy).toHaveBeenCalledWith({ id: BILL_ID });
      expect(billRepo.save).toHaveBeenCalledTimes(1);
      expect(billStore.get(BILL_ID)!.status).toBe(BillStatus.PAID);
    });

    it('200: PENDING → PAID khi status=paid', async () => {
      const bill = buildBill({ id: OTHER_BILL_ID, status: BillStatus.PENDING });
      billStore.set(OTHER_BILL_ID, bill);

      const res = await request(appAdmin.getHttpServer())
        .post('/payment-webhook')
        .set('x-webhook-secret', WEBHOOK_SECRET)
        .send(makePayload({ billId: OTHER_BILL_ID, status: 'paid' }))
        .expect(200);

      expect(res.body).toEqual({ received: true, processed: 'paid' });
      expect(billRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: BillStatus.PAID }));
    });

    it('200: already-paid khi bill đã PAID — không cập nhật lại', async () => {
      const bill = buildBill({ id: BILL_ID, status: BillStatus.PAID });
      billStore.set(BILL_ID, bill);

      const res = await request(appAdmin.getHttpServer())
        .post('/payment-webhook')
        .set('x-webhook-secret', WEBHOOK_SECRET)
        .send(makePayload({ billId: BILL_ID, status: 'success' }))
        .expect(200);

      expect(res.body).toEqual({ received: true, processed: 'already-paid' });
      expect(billRepo.save).not.toHaveBeenCalled();
    });

    it('400: billId không tồn tại', async () => {
      await request(appAdmin.getHttpServer())
        .post('/payment-webhook')
        .set('x-webhook-secret', WEBHOOK_SECRET)
        .send(makePayload({ billId: '00000000-0000-4000-a000-00000000dead', status: 'success' }))
        .expect(400);
    });
  });

  // =========================================================================
  // POST /payment-webhook — success/paid không billId → log
  // =========================================================================
  describe('POST — success/paid (không billId)', () => {
    it('200: không có billId → vẫn nhận, không xử lý bill', async () => {
      const res = await request(appAdmin.getHttpServer())
        .post('/payment-webhook')
        .set('x-webhook-secret', WEBHOOK_SECRET)
        .send(makePayload({ billId: undefined, status: 'success' }))
        .expect(200);

      expect(res.body).toEqual({ received: true, processed: 'success' });
      expect(billRepo.findOneBy).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // POST /payment-webhook — refund / chargeback
  // =========================================================================
  describe('POST — refund / chargeback', () => {
    it('200: PAID → CANCELLED khi refund có billId', async () => {
      const bill = buildBill({ id: BILL_ID, status: BillStatus.PAID });
      billStore.set(BILL_ID, bill);

      const res = await request(appAdmin.getHttpServer())
        .post('/payment-webhook')
        .set('x-webhook-secret', WEBHOOK_SECRET)
        .send(makePayload({ billId: BILL_ID, status: 'refund' }))
        .expect(200);

      expect(res.body).toEqual({ received: true, processed: 'refund' });
      expect(billRepo.save).toHaveBeenCalledTimes(1);
      expect(billStore.get(BILL_ID)!.status).toBe(BillStatus.CANCELLED);
    });

    it('200: PAID → CANCELLED khi chargeback có billId', async () => {
      const bill = buildBill({ id: OTHER_BILL_ID, status: BillStatus.PAID });
      billStore.set(OTHER_BILL_ID, bill);

      const res = await request(appAdmin.getHttpServer())
        .post('/payment-webhook')
        .set('x-webhook-secret', WEBHOOK_SECRET)
        .send(makePayload({ billId: OTHER_BILL_ID, status: 'chargeback' }))
        .expect(200);

      expect(res.body).toEqual({ received: true, processed: 'chargeback' });
      expect(billStore.get(OTHER_BILL_ID)!.status).toBe(BillStatus.CANCELLED);
    });

    it('200: refund không billId → không làm gì với bill', async () => {
      const res = await request(appAdmin.getHttpServer())
        .post('/payment-webhook')
        .set('x-webhook-secret', WEBHOOK_SECRET)
        .send(makePayload({ billId: undefined, status: 'refund' }))
        .expect(200);

      expect(res.body).toEqual({ received: true, processed: 'refund' });
      expect(billRepo.findOneBy).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // POST /payment-webhook — status khác (pending)
  // =========================================================================
  describe('POST — status khác', () => {
    it('200: status=pending → received true, processed pending', async () => {
      const res = await request(appAdmin.getHttpServer())
        .post('/payment-webhook')
        .set('x-webhook-secret', WEBHOOK_SECRET)
        .send(makePayload({ status: 'pending' }))
        .expect(200);

      expect(res.body).toEqual({ received: true, processed: 'pending' });
      expect(billRepo.save).not.toHaveBeenCalled();
    });
  });
});
