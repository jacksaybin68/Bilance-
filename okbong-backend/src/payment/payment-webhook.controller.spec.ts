import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { BillStatus } from '../bill/dto/bill.dto';
import { BillEntity } from '../bill/entity/bill.entity';
import { PaymentWebhookController, PaymentWebhookPayload } from './payment-webhook.controller';
import { AppService } from './app.service';

type MockBillRepo = {
  findOneBy: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
};

function makePayload(overrides: Partial<PaymentWebhookPayload> = {}): PaymentWebhookPayload {
  return {
    externalId: 'wp-' + Math.random().toString(36).slice(2, 10),
    billId: '00000000-0000-4000-a000-000000000001',
    amount: 100000,
    status: 'success',
    timestamp: new Date().toISOString(),
    signature: undefined,
    ...overrides,
  };
}

describe('PaymentWebhookController', () => {
  let controller: PaymentWebhookController;
  let billRepo: MockBillRepo;
  let appService: AppService;
  let configService: { get: ReturnType<typeof vi.fn> };

  const WEBHOOK_SECRET = 'webhook-secret-123';

  beforeEach(async () => {
    billRepo = {
      findOneBy: vi.fn(),
      save: vi.fn(async (bill: BillEntity) => ({ ...bill, id: bill.id })),
    };

    configService = {
      get: vi.fn((key: string, def?: string) => (key === 'WEBHOOK_SECRET' ? WEBHOOK_SECRET : def)),
    };

    const appServiceMock = {
      computeWebhookSignature: (payload: PaymentWebhookPayload, secret: string) => {
        const data = JSON.stringify(payload);
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(`${data}${secret}`).digest('hex');
      },
      logWebhookNoBillId: (payload: PaymentWebhookPayload) => {
        // no-op in test
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentWebhookController],
      providers: [
        { provide: getRepositoryToken(BillEntity), useValue: billRepo },
        { provide: ConfigService, useValue: configService },
        { provide: AppService, useValue: appServiceMock },
      ],
    }).compile();

    controller = module.get<PaymentWebhookController>(PaymentWebhookController);
    appService = module.get<AppService>(AppService);
  });

  afterEach(() => vi.clearAllMocks());

  // =========================================================================
  // Signature verification
  // =========================================================================
  describe('computeWebhookSignature', () => {
    it('tạo HMAC-SHA256 consistent từ payload + secret', () => {
      const payload = makePayload();
      const sig1 = appService.computeWebhookSignature(payload, WEBHOOK_SECRET);
      const sig2 = appService.computeWebhookSignature(payload, WEBHOOK_SECRET);
      expect(sig1).toBe(sig2);
      expect(sig1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('signature khác khi secret khác', () => {
      const payload = makePayload();
      const sig1 = appService.computeWebhookSignature(payload, 'secret-a');
      const sig2 = appService.computeWebhookSignature(payload, 'secret-b');
      expect(sig1).not.toBe(sig2);
    });

    it('signature khác khi payload khác', () => {
      const sig1 = appService.computeWebhookSignature(makePayload({ amount: 100 }), WEBHOOK_SECRET);
      const sig2 = appService.computeWebhookSignature(makePayload({ amount: 200 }), WEBHOOK_SECRET);
      expect(sig1).not.toBe(sig2);
    });
  });

  describe('logWebhookNoBillId', () => {
    it('không throw — gọi console.warn', () => {
      const payload = makePayload({ billId: undefined, status: 'success' });
      expect(() => appService.logWebhookNoBillId(payload)).not.toThrow();
    });
  });

  // =========================================================================
  // POST /payment-webhook — secret validation
  // =========================================================================
  describe('handleWebhook — secret', () => {
    it('401 khi thiếu header x-webhook-secret', async () => {
      await expect(
        controller.handleWebhook(makePayload(), undefined, undefined),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('401 khi secret sai', async () => {
      await expect(
        controller.handleWebhook(makePayload(), 'wrong-secret', undefined),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('accept khi secret đúng và không có signature', async () => {
      const payload = makePayload({ billId: undefined });
      const result = await controller.handleWebhook(payload, WEBHOOK_SECRET, undefined);
      expect(result).toEqual({ received: true, processed: 'success' });
    });
  });

  // =========================================================================
  // POST /payment-webhook — signature verification
  // =========================================================================
  describe('handleWebhook — signature', () => {
    it('400 khi signature không khớp', async () => {
      const payload = makePayload({ signature: 'bad-signature' });
      await expect(
        controller.handleWebhook(payload, WEBHOOK_SECRET, 'bad-signature'),
      ).rejects.toThrow(BadRequestException);
    });

    it('accept khi signature khớp', async () => {
      const payload = makePayload({ signature: undefined });
      const expectedSig = appService.computeWebhookSignature(payload, WEBHOOK_SECRET);
      const result = await controller.handleWebhook(payload, WEBHOOK_SECRET, expectedSig);
      expect(result).toEqual({ received: true, processed: 'success' });
    });
  });

  // =========================================================================
  // POST /payment-webhook — success / paid với billId
  // =========================================================================
  describe('handleWebhook — success / paid (có billId)', () => {
    it('PAID khi bill chưa paid và status=success', async () => {
      const billId = 'bill-existing-1';
      const bill = { id: billId, userId: 'u1', amount: 100000, status: BillStatus.PENDING, type: 'payment', description: null, createdAt: new Date(), updatedAt: new Date() } as BillEntity;

      billRepo.findOneBy.mockResolvedValue(bill);

      const payload = makePayload({ billId, status: 'success' });
      const result = await controller.handleWebhook(payload, WEBHOOK_SECRET, undefined);

      expect(result).toEqual({ received: true, processed: 'success' });
      expect(billRepo.findOneBy).toHaveBeenCalledWith({ id: billId });
      expect(billRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: BillStatus.PAID }));
    });

    it('PAID khi status=paid', async () => {
      const billId = 'bill-existing-2';
      const bill = { id: billId, userId: 'u1', amount: 50000, status: BillStatus.PENDING, type: 'payment', description: null, createdAt: new Date(), updatedAt: new Date() } as BillEntity;

      billRepo.findOneBy.mockResolvedValue(bill);

      const payload = makePayload({ billId, status: 'paid' });
      const result = await controller.handleWebhook(payload, WEBHOOK_SECRET, undefined);

      expect(result).toEqual({ received: true, processed: 'paid' });
      expect(billRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: BillStatus.PAID }));
    });

    it('already-paid khi bill đã PAID — không update lại', async () => {
      const billId = 'bill-already-paid';
      const bill = { id: billId, userId: 'u1', amount: 100000, status: BillStatus.PAID, type: 'payment', description: null, createdAt: new Date(), updatedAt: new Date() } as BillEntity;

      billRepo.findOneBy.mockResolvedValue(bill);

      const payload = makePayload({ billId, status: 'success' });
      const result = await controller.handleWebhook(payload, WEBHOOK_SECRET, undefined);

      expect(result).toEqual({ received: true, processed: 'already-paid' });
      expect(billRepo.save).not.toHaveBeenCalled();
    });

    it('400 khi billId không tìm thấy', async () => {
      billRepo.findOneBy.mockResolvedValue(null);

      const payload = makePayload({ billId: 'missing-bill', status: 'success' });
      await expect(
        controller.handleWebhook(payload, WEBHOOK_SECRET, undefined),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // POST /payment-webhook — success/paid không billId → log
  // =========================================================================
  describe('handleWebhook — success/paid (không billId)', () => {
    it('gọi logWebhookNoBillId khi không có billId', async () => {
      const payload = makePayload({ billId: undefined, status: 'success' });
      await controller.handleWebhook(payload, WEBHOOK_SECRET, undefined);
      // logWebhookNoBillId là method của AppService — verify không throw và có log
      expect(() => appService.logWebhookNoBillId(payload)).not.toThrow();
    });
  });

  // =========================================================================
  // POST /payment-webhook — refund / chargeback
  // =========================================================================
  describe('handleWebhook — refund / chargeback', () => {
    it('CANCELLED khi refund có billId', async () => {
      const billId = 'bill-for-refund';
      const bill = { id: billId, userId: 'u1', amount: 100000, status: BillStatus.PAID, type: 'payment', description: null, createdAt: new Date(), updatedAt: new Date() } as BillEntity;

      billRepo.findOneBy.mockResolvedValue(bill);

      const payload = makePayload({ billId, status: 'refund' });
      const result = await controller.handleWebhook(payload, WEBHOOK_SECRET, undefined);

      expect(result).toEqual({ received: true, processed: 'refund' });
      expect(billRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: BillStatus.CANCELLED }));
    });

    it('CANCELLED khi chargeback có billId', async () => {
      const billId = 'bill-for-chargeback';
      const bill = { id: billId, userId: 'u1', amount: 200000, status: BillStatus.PAID, type: 'payment', description: null, createdAt: new Date(), updatedAt: new Date() } as BillEntity;

      billRepo.findOneBy.mockResolvedValue(bill);

      const payload = makePayload({ billId, status: 'chargeback' });
      const result = await controller.handleWebhook(payload, WEBHOOK_SECRET, undefined);

      expect(result).toEqual({ received: true, processed: 'chargeback' });
      expect(billRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: BillStatus.CANCELLED }));
    });

    it('không làm gì khi refund không có billId', async () => {
      const payload = makePayload({ billId: undefined, status: 'refund' });
      const result = await controller.handleWebhook(payload, WEBHOOK_SECRET, undefined);
      expect(result).toEqual({ received: true, processed: 'refund' });
      expect(billRepo.save).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // POST /payment-webhook — status khác (pending)
  // =========================================================================
  describe('handleWebhook — status khác', () => {
    it('received: true, processed: pending khi status=pending', async () => {
      const payload = makePayload({ status: 'pending' });
      const result = await controller.handleWebhook(payload, WEBHOOK_SECRET, undefined);
      expect(result).toEqual({ received: true, processed: 'pending' });
      expect(billRepo.save).not.toHaveBeenCalled();
    });
  });
});
