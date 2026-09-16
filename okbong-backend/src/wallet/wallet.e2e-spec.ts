import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtStrategy } from '../auth/jwt.strategy';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../enumeration/role.enum';
import { WalletType } from './dto/wallet.dto';
import { WalletEntity, WalletStatus } from './entity/wallet.entity';
import { TransactionEntity, TransactionType, TransactionStatus } from './entity/transaction.entity';
import { TransactionQueryDto } from './dto/transaction.dto';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const USER_ID = '00000000-0000-4000-a000-000000000001';
const OTHER_USER = '00000000-0000-4000-a000-000000000002';
const ADMIN_ID = '00000000-0000-4000-a000-00000000ad01';

type MockWalletRepo = {
  find: ReturnType<typeof vi.fn>;
  findOneBy: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
};
type MockTxRepo = {
  findOne: ReturnType<typeof vi.fn>;
  findAndCount: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
};

function buildWallet(overrides: Partial<WalletEntity> = {}): WalletEntity {
  return {
    id: 'wallet-' + Math.random().toString(36).slice(2, 8),
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

function buildTx(overrides: Partial<TransactionEntity> = {}): TransactionEntity {
  return {
    id: 'tx-' + Math.random().toString(36).slice(2, 8),
    walletId: 'wallet-xxx',
    userId: USER_ID,
    type: TransactionType.DEPOSIT,
    status: TransactionStatus.COMPLETED,
    amount: 100,
    balanceBefore: 0,
    balanceAfter: 100,
    description: 'Nạp tiền vào ví',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  } as TransactionEntity;
}

describe('Wallet E2E — Nạp/Rút + Transaction History', () => {
  let app: INestApplication;
  let appNoAuth: INestApplication;
  let walletRepo: MockWalletRepo;
  let txRepo: MockTxRepo;
  let dataSource: { transaction: ReturnType<typeof vi.fn> };
  let walletStore: Map<string, WalletEntity>;
  let txStore: Map<string, TransactionEntity>;
  let currentUser: { id: string; email: string; role: Role };
  const keyOf = (userId: string, type: WalletType) => `${userId}:${type}`;

  beforeAll(async () => {
    walletStore = new Map<string, WalletEntity>();
    txStore = new Map<string, TransactionEntity>();
    currentUser = { id: USER_ID, email: 'user@test.com', role: Role.USER };

    txRepo = {
      findOne: vi.fn(async ({ where }: { where: { walletId?: string; userId?: string; type?: TransactionType; status?: TransactionStatus } }) => {
        const found = [...txStore.values()].find(
          (t) =>
            (!where.walletId || t.walletId === where.walletId) &&
            (!where.userId || t.userId === where.userId) &&
            (!where.type || t.type === where.type) &&
            (!where.status || t.status === where.status),
        );
        return found ? { ...found } : null;
      }),
      findAndCount: vi.fn(async ({ where, order, take, skip }: any) => {
        let items = [...txStore.values()];
        if (where?.walletId) items = items.filter((t) => t.walletId === where.walletId);
        if (where?.userId) items = items.filter((t) => t.userId === where.userId);
        if (where?.type) items = items.filter((t) => t.type === where.type);
        if (where?.status) items = items.filter((t) => t.status === where.status);
        if (where?.reference) items = items.filter((t) => t.reference === where.reference);
        if (order?.createdAt === 'DESC') items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        else items.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        const total = items.length;
        const paged = items.slice(skip ?? 0, (skip ?? 0) + (take ?? 50));
        return [paged, total] as [TransactionEntity[], number];
      }),
      create: vi.fn((dto: Partial<TransactionEntity>) => ({ ...dto }) as TransactionEntity),
      save: vi.fn(async (entity: TransactionEntity) => {
        const clone = {
          ...entity,
          id: entity.id ?? `tx-${Date.now()}-${Math.random()}`,
          createdAt: entity.createdAt ?? new Date(),
          updatedAt: new Date(),
        } as TransactionEntity;
        txStore.set(clone.id, clone);
        return clone;
      }),
    };

    walletRepo = {
      find: vi.fn(async ({ where }: { where: { userId?: string; type?: WalletType } }) => {
        const all = [...walletStore.values()];
        return all
          .filter((w) => !where?.userId || w.userId === where.userId)
          .filter((w) => !where?.type || w.type === where.type)
          .sort((a, b) => (a.createdAt?.getTime?.() ?? 0) - (b.createdAt?.getTime?.() ?? 0));
      }),
      findOneBy: vi.fn(async ({ id }: { id: string }) => {
        const found = [...walletStore.values()].find((w) => w.id === id);
        return found ? { ...found } : null;
      }),
      create: vi.fn((dto: Partial<WalletEntity>) => ({ ...dto }) as WalletEntity),
      save: vi.fn(async (entity: WalletEntity) => {
        const clone = {
          ...entity,
          id: entity.id ?? `wallet-${Date.now()}-${Math.random()}`,
          createdAt: entity.createdAt ?? new Date(),
          updatedAt: new Date(),
        } as WalletEntity;
        walletStore.set(keyOf(clone.userId, clone.type), clone);
        return clone;
      }),
    };

    let txQueue: Promise<void> = Promise.resolve();
    dataSource = {
      transaction: vi.fn((cb: (manager: any) => Promise<WalletEntity>) => {
        const manager = { getRepository: (t: any) => (t === WalletEntity ? walletRepo : txRepo) } as any;
        const run = () => cb(manager);
        const result = txQueue.then(run, run) as Promise<WalletEntity>;
        txQueue = result.then(() => undefined, () => undefined);
        return result;
      }),
    };

    const mockJwtGuard = {
      canActivate: (context: any) => {
        const req = context.switchToHttp().getRequest();
        req.user = currentUser;
        return true;
      },
    } as unknown as { canActivate: (ctx: any) => boolean };

    const moduleRef = await Test.createTestingModule({
      controllers: [WalletController],
      providers: [
        WalletService,
        { provide: getRepositoryToken(WalletEntity), useValue: walletRepo },
        { provide: getRepositoryToken(TransactionEntity), useValue: txRepo },
        { provide: require('typeorm').DataSource, useValue: dataSource },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: any) => {
          const req = ctx.switchToHttp().getRequest();
          req.user = currentUser;
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        validationError: { target: false, value: false },
      }),
    );
    await app.init();

    // App without guard override for 401 test
    const noAuthModule = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers: [WalletController],
      providers: [
        WalletService,
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: { get: (_key: string, def?: string) => def ?? 'okbong-secret-key' },
        },
        { provide: getRepositoryToken(WalletEntity), useValue: walletRepo },
        { provide: getRepositoryToken(TransactionEntity), useValue: txRepo },
        { provide: require('typeorm').DataSource, useValue: dataSource },
      ],
    }).compile();
    appNoAuth = noAuthModule.createNestApplication();
    appNoAuth.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        validationError: { target: false, value: false },
      }),
    );
    await appNoAuth.init();

    // Silence unused warning
    void mockJwtGuard;
  });

  afterAll(async () => {
    await app.close();
    await appNoAuth.close();
  });

  beforeEach(() => {
    walletStore.clear();
    txStore.clear();
    currentUser = { id: USER_ID, email: 'user@test.com', role: Role.USER };
    vi.clearAllMocks();
    // Re-attach mock impls cleared by clearAllMocks
    txRepo.findOne.mockImplementation(async ({ where }: { where: { walletId?: string; userId?: string; type?: TransactionType; status?: TransactionStatus } }) => {
      const found = [...txStore.values()].find(
        (t) =>
          (!where.walletId || t.walletId === where.walletId) &&
          (!where.userId || t.userId === where.userId) &&
          (!where.type || t.type === where.type) &&
          (!where.status || t.status === where.status),
      );
      return found ? { ...found } : null;
    });
    txRepo.findAndCount.mockImplementation(async ({ where, order, take, skip }: any) => {
      let items = [...txStore.values()];
      if (where?.walletId) items = items.filter((t) => t.walletId === where.walletId);
      if (where?.userId) items = items.filter((t) => t.userId === where.userId);
      if (where?.type) items = items.filter((t) => t.type === where.type);
      if (where?.status) items = items.filter((t) => t.status === where.status);
      if (where?.reference) items = items.filter((t) => t.reference === where.reference);
      if (order?.createdAt === 'DESC') items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      else items.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      const total = items.length;
      const paged = items.slice(skip ?? 0, (skip ?? 0) + (take ?? 50));
      return [paged, total] as [TransactionEntity[], number];
    });
    txRepo.create.mockImplementation((dto: Partial<TransactionEntity>) => ({ ...dto }) as TransactionEntity);
    txRepo.save.mockImplementation(async (entity: TransactionEntity) => {
      const clone = {
        ...entity,
        id: entity.id ?? `tx-${Date.now()}-${Math.random()}`,
        createdAt: entity.createdAt ?? new Date(),
        updatedAt: new Date(),
      } as TransactionEntity;
      txStore.set(clone.id, clone);
      return clone;
    });
    walletRepo.find.mockImplementation(async ({ where }: { where: { userId?: string; type?: WalletType } }) => {
      const all = [...walletStore.values()];
      return all
        .filter((w) => !where?.userId || w.userId === where.userId)
        .filter((w) => !where?.type || w.type === where.type)
        .sort((a, b) => (a.createdAt?.getTime?.() ?? 0) - (b.createdAt?.getTime?.() ?? 0));
    });
    walletRepo.findOneBy.mockImplementation(async ({ id }: { id: string }) => {
      const found = [...walletStore.values()].find((w) => w.id === id);
      return found ? { ...found } : null;
    });
    walletRepo.create.mockImplementation((dto: Partial<WalletEntity>) => ({ ...dto }) as WalletEntity);
    walletRepo.save.mockImplementation(async (entity: WalletEntity) => {
      const clone = {
        ...entity,
        id: entity.id ?? `wallet-${Date.now()}-${Math.random()}`,
        createdAt: entity.createdAt ?? new Date(),
        updatedAt: new Date(),
      } as WalletEntity;
      walletStore.set(keyOf(clone.userId, clone.type), clone);
      return clone;
    });
    let txQueue: Promise<void> = Promise.resolve();
    dataSource.transaction.mockImplementation((cb: (manager: any) => Promise<WalletEntity>) => {
      const manager = { getRepository: (t: any) => (t === WalletEntity ? walletRepo : txRepo) } as any;
      const run = () => cb(manager);
      const result = txQueue.then(run, run) as Promise<WalletEntity>;
      txQueue = result.then(() => undefined, () => undefined);
      return result;
    });
  });

  // =========================================================================
  // POST /wallet/deposit — Nạp
  // =========================================================================
  describe('POST /wallet/deposit — Nạp tiền', () => {
    it('success: tạo ví mới khi chưa có, balance = amount', async () => {
      const res = await request(app.getHttpServer()).post('/wallet/deposit').send({ amount: 150.5 }).expect(200);
      expect(res.body.balance).toBe(150.5);
      expect(res.body.userId).toBe(USER_ID);
    });

    it('success: cộng dồn vào ví đã tồn tại', async () => {
      await request(app.getHttpServer()).post('/wallet/deposit').send({ amount: 100 }).expect(200);
      const res = await request(app.getHttpServer()).post('/wallet/deposit').send({ amount: 50 }).expect(200);
      expect(res.body.balance).toBe(150);
    });

    it('roundAmount: 0.1 + 0.2 = 0.3 (không lệch floating-point)', async () => {
      await request(app.getHttpServer()).post('/wallet/deposit').send({ amount: 0.1 }).expect(200);
      const res = await request(app.getHttpServer()).post('/wallet/deposit').send({ amount: 0.2 }).expect(200);
      expect(res.body.balance).toBe(0.3);
    });

    it('thành công với type BANK tách biệt E_WALLET', async () => {
      await request(app.getHttpServer())
        .post('/wallet/deposit')
        .send({ amount: 100, type: WalletType.E_WALLET })
        .expect(200);
      const res = await request(app.getHttpServer())
        .post('/wallet/deposit')
        .send({ amount: 200, type: WalletType.BANK })
        .expect(200);
      expect(res.body.type).toBe(WalletType.BANK);
      expect(res.body.balance).toBe(200);
      // E_WALLET vẫn 100
      expect(walletStore.get(keyOf(USER_ID, WalletType.E_WALLET))!.balance).toBe(100);
    });

    it('mặc định userId = currentUser khi không truyền userId', async () => {
      const res = await request(app.getHttpServer()).post('/wallet/deposit').send({ amount: 77 }).expect(200);
      expect(res.body.userId).toBe(currentUser.id);
    });

    it('cho phép deposit cho userId khác khi truyền kèm', async () => {
      const res = await request(app.getHttpServer())
        .post('/wallet/deposit')
        .send({ amount: 33, userId: OTHER_USER })
        .expect(200);
      expect(res.body.userId).toBe(OTHER_USER);
    });
  });

  // =========================================================================
  // POST /wallet/withdraw — Rút
  // =========================================================================
  describe('POST /wallet/withdraw — Rút tiền', () => {
    it('success khi đủ số dư', async () => {
      await request(app.getHttpServer()).post('/wallet/deposit').send({ amount: 200 }).expect(200);
      const res = await request(app.getHttpServer()).post('/wallet/withdraw').send({ amount: 80 }).expect(200);
      expect(res.body.balance).toBe(120);
    });

    it('400 khi rút quá số dư — Insufficient balance', async () => {
      walletStore.set(
        keyOf(USER_ID, WalletType.E_WALLET),
        buildWallet({ balance: 30, userId: USER_ID, type: WalletType.E_WALLET }),
      );
      const res = await request(app.getHttpServer()).post('/wallet/withdraw').send({ amount: 50 }).expect(400);
      expect(res.body.message).toMatch(/Insufficient balance/i);
      expect(walletStore.get(keyOf(USER_ID, WalletType.E_WALLET))!.balance).toBe(30);
    });

    it('400 khi ví chưa tồn tại mà withdraw', async () => {
      const res = await request(app.getHttpServer())
        .post('/wallet/withdraw')
        .send({ amount: 10, userId: OTHER_USER })
        .expect(400);
      expect(res.body.message).toMatch(/Insufficient balance/i);
    });

    it('rút toàn bộ số dư về 0', async () => {
      await request(app.getHttpServer()).post('/wallet/deposit').send({ amount: 75.5 }).expect(200);
      const res = await request(app.getHttpServer()).post('/wallet/withdraw').send({ amount: 75.5 }).expect(200);
      expect(res.body.balance).toBe(0);
    });
  });

  // =========================================================================
  // Validation — DTO
  // =========================================================================
  describe('Validation — DTO', () => {
    it('400 khi amount = 0', async () => {
      await request(app.getHttpServer()).post('/wallet/deposit').send({ amount: 0 }).expect(400);
    });

    it('400 khi amount âm', async () => {
      await request(app.getHttpServer()).post('/wallet/deposit').send({ amount: -10 }).expect(400);
    });

    it('400 khi thiếu amount', async () => {
      await request(app.getHttpServer()).post('/wallet/deposit').send({}).expect(400);
    });

    it('400 khi amount quá lớn (>1e9)', async () => {
      await request(app.getHttpServer()).post('/wallet/deposit').send({ amount: 2_000_000_000 }).expect(400);
    });

    it('400 khi amount có quá 2 chữ số thập phân', async () => {
      await request(app.getHttpServer()).post('/wallet/deposit').send({ amount: 1.234 }).expect(400);
    });

    it('400 khi userId không phải UUID', async () => {
      await request(app.getHttpServer()).post('/wallet/deposit').send({ amount: 10, userId: 'not-uuid' }).expect(400);
    });
  });

  // =========================================================================
  // GET /wallet & GET /wallet/balance
  // =========================================================================
  describe('GET /wallet — danh sách ví', () => {
    it('trả về danh sách ví của current user', async () => {
      await request(app.getHttpServer()).post('/wallet/deposit').send({ amount: 10 }).expect(200);
      await request(app.getHttpServer())
        .post('/wallet/deposit')
        .send({ amount: 20, type: WalletType.BANK })
        .expect(200);
      const res = await request(app.getHttpServer()).get('/wallet').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
    });

    it('GET /wallet/balance — balance overview', async () => {
      await request(app.getHttpServer()).post('/wallet/deposit').send({ amount: 42 }).expect(200);
      const res = await request(app.getHttpServer()).get('/wallet/balance').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].balance).toBe(42);
    });

    it('GET /wallet/:userId — ví của user khác', async () => {
      walletStore.set(
        keyOf(OTHER_USER, WalletType.E_WALLET),
        buildWallet({ userId: OTHER_USER, type: WalletType.E_WALLET, balance: 999 }),
      );
      const res = await request(app.getHttpServer()).get(`/wallet/${OTHER_USER}`).expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].userId).toBe(OTHER_USER);
      expect(res.body[0].balance).toBe(999);
    });
  });

  // =========================================================================
  // GET /wallet/:walletId/transactions — Transaction History
  // =========================================================================
  describe('GET /wallet/:walletId/transactions — Lịch sử giao dịch', () => {
    let walletId: string;

    beforeEach(async () => {
      // Đảm bảo có ví
      await request(app.getHttpServer()).post('/wallet/deposit').send({ amount: 500 }).expect(200);
      const wallets = await request(app.getHttpServer()).get('/wallet').expect(200);
      walletId = wallets.body[0].id;

      // Seed transaction history: 3 deposits + 2 withdraws
      txStore.set(
        'tx-dep-1',
        buildTx({
          walletId,
          userId: USER_ID,
          type: TransactionType.DEPOSIT,
          status: TransactionStatus.COMPLETED,
          amount: 200,
          balanceBefore: 0,
          balanceAfter: 200,
        }),
      );
      txStore.set(
        'tx-dep-2',
        buildTx({
          walletId,
          userId: USER_ID,
          type: TransactionType.DEPOSIT,
          status: TransactionStatus.COMPLETED,
          amount: 150,
          balanceBefore: 200,
          balanceAfter: 350,
          createdAt: new Date('2026-02-01T00:00:00Z'),
        }),
      );
      txStore.set(
        'tx-dep-3',
        buildTx({
          walletId,
          userId: USER_ID,
          type: TransactionType.DEPOSIT,
          status: TransactionStatus.COMPLETED,
          amount: 100,
          balanceBefore: 350,
          balanceAfter: 450,
          createdAt: new Date('2026-03-01T00:00:00Z'),
        }),
      );
      txStore.set(
        'tx-wd-1',
        buildTx({
          walletId,
          userId: USER_ID,
          type: TransactionType.WITHDRAW,
          status: TransactionStatus.COMPLETED,
          amount: 50,
          balanceBefore: 450,
          balanceAfter: 400,
          createdAt: new Date('2026-04-01T00:00:00Z'),
        }),
      );
      txStore.set(
        'tx-wd-2',
        buildTx({
          walletId,
          userId: USER_ID,
          type: TransactionType.WITHDRAW,
          status: TransactionStatus.COMPLETED,
          amount: 100,
          balanceBefore: 400,
          balanceAfter: 300,
          createdAt: new Date('2026-05-01T00:00:00Z'),
        }),
      );
    });

    it('200: trả về danh sách transaction của ví, mặc định 50 items, DESC', async () => {
      const res = await request(app.getHttpServer()).get(`/wallet/${walletId}/transactions`).expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(5);
      // Último deposit (200) phải là đầu tiên theo DESC createdAt
      expect(res.body[0].type).toBe(TransactionType.WITHDRAW);
      expect(res.body[0].amount).toBe(100);
    });

    it('lọc theo type=DEPOSIT', async () => {
      const res = await request(app.getHttpServer())
        .get(`/wallet/${walletId}/transactions`)
        .query({ type: TransactionType.DEPOSIT })
        .expect(200);
      expect(res.body).toHaveLength(3);
      expect(res.body.every((t: TransactionEntity) => t.type === TransactionType.DEPOSIT)).toBe(true);
    });

    it('lọc theo type=WITHDRAW', async () => {
      const res = await request(app.getHttpServer())
        .get(`/wallet/${walletId}/transactions`)
        .query({ type: TransactionType.WITHDRAW })
        .expect(200);
      expect(res.body).toHaveLength(2);
      expect(res.body.every((t: TransactionEntity) => t.type === TransactionType.WITHDRAW)).toBe(true);
    });

    it('lọc theo status=COMPLETED', async () => {
      const res = await request(app.getHttpServer())
        .get(`/wallet/${walletId}/transactions`)
        .query({ status: TransactionStatus.COMPLETED })
        .expect(200);
      expect(res.body).toHaveLength(5);
    });

    it('lọc theo reference (không có → trả empty)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/wallet/${walletId}/transactions`)
        .query({ reference: 'nonexistent-ref' })
        .expect(200);
      expect(res.body).toHaveLength(0);
    });

    it('400 khi walletId không phải UUID', async () => {
      await request(app.getHttpServer()).get('/wallet/not-a-uuid/transactions').expect(400);
    });

    it('404 khi wallet không tồn tại', async () => {
      const missingId = '00000000-0000-4000-a000-00000000ffff';
      const res = await request(app.getHttpServer()).get(`/wallet/${missingId}/transactions`).expect(404);
      expect(res.body.message).toMatch(/was not found/i);
    });

    it('phân trang: limit=2', async () => {
      const res = await request(app.getHttpServer())
        .get(`/wallet/${walletId}/transactions`)
        .query({ limit: 2 })
        .expect(200);
      expect(res.body).toHaveLength(2);
    });
  });

  // =========================================================================
  // Unauthorized (no guard override)
  // =========================================================================
  describe('Unauthorized — không có token/guard', () => {
    it('401 khi không có JWT — deposit', async () => {
      await request(appNoAuth.getHttpServer()).post('/wallet/deposit').send({ amount: 10 }).expect(401);
    });

    it('401 khi không có JWT — GET /wallet', async () => {
      await request(appNoAuth.getHttpServer()).get('/wallet').expect(401);
    });

    it('401 khi không có JWT — transactionHistory', async () => {
      // Cần walletId hợp lệ để route đến controller (guard chặn trước)
      walletStore.set(
        keyOf(USER_ID, WalletType.E_WALLET),
        buildWallet({ id: 'some-wallet-id', userId: USER_ID, type: WalletType.E_WALLET }),
      );
      await request(appNoAuth.getHttpServer()).get('/wallet/some-wallet-id/transactions').expect(401);
    });
  });
});
