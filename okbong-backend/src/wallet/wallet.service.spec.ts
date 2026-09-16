import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { roundAmount } from '../common/utils/amount.util';
import { WalletType } from './dto/wallet.dto';
import { WalletEntity, WalletStatus } from './entity/wallet.entity';
import { WalletService } from './wallet.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
type MockTxRepo = {
  findOne: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
};

type MockWalletRepo = {
  find: ReturnType<typeof vi.fn>;
  findOneBy: ReturnType<typeof vi.fn>;
};

const USER_ID = '00000000-0000-4000-a000-000000000001';
const OTHER_USER = '00000000-0000-4000-a000-000000000002';

function buildWallet(overrides: Partial<WalletEntity> = {}): WalletEntity {
  return {
    id: 'w-' + Math.random().toString(36).slice(2, 8),
    userId: USER_ID,
    type: WalletType.E_WALLET,
    balance: 0,
    currency: 'BDSD',
    status: WalletStatus.ACTIVE,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  } as WalletEntity;
}

describe('WalletService', () => {
  let service: WalletService;
  let walletRepo: MockWalletRepo;
  let txRepo: MockTxRepo;
  let dataSource: { transaction: ReturnType<typeof vi.fn> };

  // In-memory store to emulate real transaction isolation for concurrency test
  let store: Map<string, WalletEntity>;

  const keyOf = (userId: string, type: WalletType) => `${userId}:${type}`;

  beforeEach(async () => {
    store = new Map<string, WalletEntity>();

    txRepo = {
      findOne: vi.fn(async ({ where }: { where: { userId: string; type: WalletType } }) => {
        const found = store.get(keyOf(where.userId, where.type));
        // Return a shallow clone to mimic TypeORM entity detach
        return found ? { ...found } : null;
      }),
      create: vi.fn((dto: Partial<WalletEntity>) => ({ ...dto }) as WalletEntity),
      save: vi.fn(async (entity: WalletEntity) => {
        const clone = { ...entity, id: entity.id ?? `uuid-${Date.now()}-${Math.random()}` };
        store.set(keyOf(clone.userId, clone.type), clone);
        return clone;
      }),
    };

    walletRepo = {
      find: vi.fn(),
      findOneBy: vi.fn(),
    };

    // Serialize transactions to emulate row-level lock (DB isolation)
    // so concurrent Promise.all calls see each other's committed writes
    let txQueue: Promise<void> = Promise.resolve();
    dataSource = {
      transaction: vi.fn((cb: (manager: EntityManager) => Promise<WalletEntity>) => {
        const manager = { getRepository: () => txRepo } as unknown as EntityManager;
        const run = () => cb(manager);
        const result = txQueue.then(run, run) as Promise<WalletEntity>;
        txQueue = result.then(
          () => undefined,
          () => undefined,
        );
        return result;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: getRepositoryToken(WalletEntity), useValue: walletRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
  });

  afterEach(() => vi.clearAllMocks());

  // =========================================================================
  // findByUser / findOne (smoke)
  // =========================================================================
  describe('findByUser & findOne', () => {
    it('delegates findByUser to repository with correct ordering', async () => {
      const wallets = [buildWallet()];
      walletRepo.find.mockResolvedValue(wallets);
      const result = await service.findByUser(USER_ID, WalletType.E_WALLET);
      expect(walletRepo.find).toHaveBeenCalledWith({
        where: { userId: USER_ID, type: WalletType.E_WALLET },
        order: { createdAt: 'ASC' },
      });
      expect(result).toBe(wallets);
    });

    it('throws NotFoundException when wallet id does not exist', async () => {
      walletRepo.findOneBy.mockResolvedValue(null);
      await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('missing-id')).rejects.toThrow(/was not found/);
    });
  });

  // =========================================================================
  // applyDelta - cộng/trừ số dư chuẩn xác (via deposit / withdraw)
  // =========================================================================
  describe('applyDelta — cộng/trừ số dư chuẩn xác', () => {
    it('tạo ví mới với balance = amount khi chưa tồn tại (deposit)', async () => {
      const result = await service.deposit(USER_ID, 150.5, WalletType.E_WALLET);

      expect(result.balance).toBe(150.5);
      expect(result.userId).toBe(USER_ID);
      expect(txRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: USER_ID, type: WalletType.E_WALLET, balance: 0 }),
      );
      expect(txRepo.save).toHaveBeenCalledTimes(1);
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('cộng dồn chính xác vào ví đã tồn tại', async () => {
      store.set(keyOf(USER_ID, WalletType.E_WALLET), buildWallet({ balance: 100 }));
      const result = await service.deposit(USER_ID, 50, WalletType.E_WALLET);
      expect(result.balance).toBe(150);
    });

    it('trừ chính xác (withdraw)', async () => {
      store.set(keyOf(USER_ID, WalletType.E_WALLET), buildWallet({ balance: 200 }));
      const result = await service.withdraw(USER_ID, 80, WalletType.E_WALLET);
      expect(result.balance).toBe(120);
    });

    it('cho phép deposit/withdraw trên các loại ví khác nhau độc lập', async () => {
      store.set(keyOf(USER_ID, WalletType.E_WALLET), buildWallet({ type: WalletType.E_WALLET, balance: 10 }));
      store.set(keyOf(USER_ID, WalletType.BANK), buildWallet({ type: WalletType.BANK, balance: 500 }));

      await service.deposit(USER_ID, 90, WalletType.E_WALLET);
      expect(store.get(keyOf(USER_ID, WalletType.E_WALLET))!.balance).toBe(100);
      expect(store.get(keyOf(USER_ID, WalletType.BANK))!.balance).toBe(500);

      await service.withdraw(USER_ID, 100, WalletType.BANK);
      expect(store.get(keyOf(USER_ID, WalletType.BANK))!.balance).toBe(400);
    });

    it('ném BadRequestException khi delta = 0 / NaN / Infinity', async () => {
      await expect(service.deposit(USER_ID, 0, WalletType.E_WALLET)).rejects.toThrow(BadRequestException);
      await expect(service.deposit(USER_ID, NaN, WalletType.E_WALLET)).rejects.toThrow(BadRequestException);
      await expect(service.deposit(USER_ID, Infinity, WalletType.E_WALLET)).rejects.toThrow(BadRequestException);
      await expect(service.withdraw(USER_ID, 0, WalletType.BANK)).rejects.toThrow(BadRequestException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Chặn rút quá số dư
  // =========================================================================
  describe('withdraw — chặn Insufficient balance', () => {
    it('chặn withdraw khi ví chưa tồn tại', async () => {
      await expect(service.withdraw(OTHER_USER, 10, WalletType.E_WALLET)).rejects.toThrow(BadRequestException);
      await expect(service.withdraw(OTHER_USER, 10, WalletType.E_WALLET)).rejects.toThrow(/Insufficient balance/);
    });

    it('chặn withdraw vượt quá số dư hiện tại', async () => {
      store.set(keyOf(USER_ID, WalletType.E_WALLET), buildWallet({ balance: 30 }));
      await expect(service.withdraw(USER_ID, 50, WalletType.E_WALLET)).rejects.toThrow(BadRequestException);
      await expect(service.withdraw(USER_ID, 50, WalletType.E_WALLET)).rejects.toThrow(/Insufficient balance/);
      // Balance must remain unchanged after failed transaction
      expect(store.get(keyOf(USER_ID, WalletType.E_WALLET))!.balance).toBe(30);
    });

    it('chặn withdraw khi nextBalance < 0 sau làm tròn', async () => {
      store.set(keyOf(USER_ID, WalletType.E_WALLET), buildWallet({ balance: 0.01 }));
      await expect(service.withdraw(USER_ID, 0.02, WalletType.E_WALLET)).rejects.toThrow(/Insufficient balance/);
    });

    it('cho phép rút toàn bộ số dư (balance về 0)', async () => {
      store.set(keyOf(USER_ID, WalletType.E_WALLET), buildWallet({ balance: 75.5 }));
      const result = await service.withdraw(USER_ID, 75.5, WalletType.E_WALLET);
      expect(result.balance).toBe(0);
    });
  });

  // =========================================================================
  // Làm tròn số thập phân — roundAmount tránh floating point drift
  // =========================================================================
  describe('roundAmount — tránh lỗi floating point', () => {
    it('roundAmount utility: 0.1 + 0.2 phải = 0.3 chứ không phải 0.30000000000000004', () => {
      expect(roundAmount(0.1 + 0.2)).toBe(0.3);
      expect(0.1 + 0.2).not.toBe(0.3); // chứng minh lỗi gốc của JS
    });

    it('deposit 0.1 rồi deposit 0.2 → balance = 0.3', async () => {
      await service.deposit(USER_ID, 0.1, WalletType.E_WALLET);
      await service.deposit(USER_ID, 0.2, WalletType.E_WALLET);
      expect(store.get(keyOf(USER_ID, WalletType.E_WALLET))!.balance).toBe(0.3);
    });

    it('1.005 làm tròn thành 1.01 (banker edge) — kiểm qua service', async () => {
      store.set(keyOf(USER_ID, WalletType.E_WALLET), buildWallet({ balance: 0 }));
      // 1.005 is a classic floating point rounding trap
      const result = await service.deposit(USER_ID, 1.005, WalletType.E_WALLET);
      // roundAmount(0 + 1.005) = Math.round(1.005 *100)/100 = 1.01 (with EPSILON guard)
      expect(result.balance).toBe(1.01);
    });

    it('nhiều phép cộng lẻ: 0.07 + 0.07 + 0.07 = 0.21 (không lệch)', async () => {
      await service.deposit(USER_ID, 0.07, WalletType.E_WALLET);
      await service.deposit(USER_ID, 0.07, WalletType.E_WALLET);
      await service.deposit(USER_ID, 0.07, WalletType.E_WALLET);
      expect(store.get(keyOf(USER_ID, WalletType.E_WALLET))!.balance).toBe(0.21);
    });

    it('withdraw cũng làm tròn: 1.00 - 0.33 = 0.67', async () => {
      store.set(keyOf(USER_ID, WalletType.E_WALLET), buildWallet({ balance: 1.0 }));
      const result = await service.withdraw(USER_ID, 0.33, WalletType.E_WALLET);
      expect(result.balance).toBe(0.67);
    });
  });

  // =========================================================================
  // Concurrency / Race condition — giả lập 2 giao dịch đồng thời
  // =========================================================================
  describe('concurrency — 2 giao dịch đồng thời', () => {
    it('2 deposit đồng thời không làm mất cập nhật (lost update)', async () => {
      store.set(keyOf(USER_ID, WalletType.E_WALLET), buildWallet({ balance: 100 }));

      // Wrap original transaction to serialize access like a real DB row-lock:
      // Second transaction must see the result of the first save.
      const results = await Promise.all([
        service.deposit(USER_ID, 40, WalletType.E_WALLET),
        service.deposit(USER_ID, 60, WalletType.E_WALLET),
      ]);

      // Order of execution is non-deterministic, but final balance must be 200
      const finalBalance = store.get(keyOf(USER_ID, WalletType.E_WALLET))!.balance;
      expect(finalBalance).toBe(200);
      expect(results.map((r) => r.balance).sort()).toEqual([140, 200].sort());
      expect(dataSource.transaction).toHaveBeenCalledTimes(2);
    });

    it('2 withdraw đồng thời — giao dịch thứ 2 phải fail nếu không đủ tiền', async () => {
      store.set(keyOf(USER_ID, WalletType.E_WALLET), buildWallet({ balance: 50 }));

      const outcomes = await Promise.allSettled([
        service.withdraw(USER_ID, 30, WalletType.E_WALLET),
        service.withdraw(USER_ID, 30, WalletType.E_WALLET),
      ]);

      const fulfilled = outcomes.filter((o) => o.status === 'fulfilled');
      const rejected = outcomes.filter((o) => o.status === 'rejected');

      // Only one withdraw should succeed because 50 -30 -30 = -10
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(BadRequestException);

      const finalBalance = store.get(keyOf(USER_ID, WalletType.E_WALLET))!.balance;
      expect(finalBalance).toBe(20);
    });

    it('deposit và withdraw đồng thời — kết quả cuối phải nhất quán', async () => {
      store.set(keyOf(USER_ID, WalletType.E_WALLET), buildWallet({ balance: 100 }));

      await Promise.all([
        service.deposit(USER_ID, 50, WalletType.E_WALLET),
        service.withdraw(USER_ID, 30, WalletType.E_WALLET),
      ]);

      // 100 +50 -30 = 120 regardless of order
      expect(store.get(keyOf(USER_ID, WalletType.E_WALLET))!.balance).toBe(120);
    });

    it('transaction được gọi cho mỗi thao tác — đảm bảo isolation', async () => {
      store.set(keyOf(USER_ID, WalletType.E_WALLET), buildWallet({ balance: 0 }));
      await service.deposit(USER_ID, 10, WalletType.E_WALLET);
      await service.deposit(USER_ID, 20, WalletType.E_WALLET);
      await service.withdraw(USER_ID, 5, WalletType.E_WALLET);
      expect(dataSource.transaction).toHaveBeenCalledTimes(3);
      expect(store.get(keyOf(USER_ID, WalletType.E_WALLET))!.balance).toBe(25);
    });
  });
});
