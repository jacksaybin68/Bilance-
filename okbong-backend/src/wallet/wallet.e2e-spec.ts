import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import request from 'supertest';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtStrategy } from '../auth/jwt.strategy';
import { Role } from '../enumeration/role.enum';
import { WalletType } from './dto/wallet.dto';
import { WalletEntity, WalletStatus } from './entity/wallet.entity';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------
const USER_ID = '00000000-0000-4000-a000-000000000001';
const OTHER_USER = '00000000-0000-4000-a000-000000000002';

type MockTxRepo = {
  findOne: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
};
type MockWalletRepo = {
  find: ReturnType<typeof vi.fn>;
  findOneBy: ReturnType<typeof vi.fn>;
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

describe('Wallet E2E — Nạp/Rút', () => {
  let app: INestApplication;
  let appNoAuth: INestApplication;
  let walletRepo: MockWalletRepo;
  let txRepo: MockTxRepo;
  let dataSource: { transaction: ReturnType<typeof vi.fn> };
  let store: Map<string, WalletEntity>;
  let currentUser: { id: string; email: string; role: Role };
  const keyOf = (userId: string, type: WalletType) => `${userId}:${type}`;

  beforeAll(async () => {
    store = new Map<string, WalletEntity>();
    currentUser = { id: USER_ID, email: 'user@test.com', role: Role.USER };

    txRepo = {
      findOne: vi.fn(async ({ where }: { where: { userId: string; type: WalletType } }) => {
        const found = store.get(keyOf(where.userId, where.type));
        return found ? { ...found } : null;
      }),
      create: vi.fn((dto: Partial<WalletEntity>) => ({ ...dto }) as WalletEntity),
      save: vi.fn(async (entity: WalletEntity) => {
        const clone = {
          ...entity,
          id: entity.id ?? `uuid-${Date.now()}-${Math.random()}`,
          createdAt: entity.createdAt ?? new Date(),
          updatedAt: new Date(),
        } as WalletEntity;
        store.set(keyOf(clone.userId, clone.type), clone);
        return clone;
      }),
    };

    walletRepo = {
      find: vi.fn(async ({ where }: { where: { userId?: string; type?: WalletType } }) => {
        const all = [...store.values()];
        return all
          .filter((w) => !where?.userId || w.userId === where.userId)
          .filter((w) => !where?.type || w.type === where.type)
          .sort((a, b) => (a.createdAt?.getTime?.() ?? 0) - (b.createdAt?.getTime?.() ?? 0));
      }),
      findOneBy: vi.fn(async ({ id }: { id: string }) => {
        const found = [...store.values()].find((w) => w.id === id);
        return found ? { ...found } : null;
      }),
    };

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

    const mockJwtGuard = {
      canActivate: (context: Parameters<NonNullable<(typeof mockJwtGuard)['canActivate']>>[0]) => {
        const req = context.switchToHttp().getRequest();
        req.user = currentUser;
        return true;
      },
    } as unknown as { canActivate: (ctx: any) => boolean };

    // Alias to satisfy closure reference
    const guardRef = mockJwtGuard;

    const moduleRef = await Test.createTestingModule({
      controllers: [WalletController],
      providers: [
        WalletService,
        { provide: getRepositoryToken(WalletEntity), useValue: walletRepo },
        { provide: DataSource, useValue: dataSource },
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
        { provide: DataSource, useValue: dataSource },
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
    void guardRef;
  });

  afterAll(async () => {
    await app.close();
    await appNoAuth.close();
  });

  beforeEach(() => {
    store.clear();
    currentUser = { id: USER_ID, email: 'user@test.com', role: Role.USER };
    vi.clearAllMocks();
    // Re-attach mock impls cleared by clearAllMocks
    txRepo.findOne.mockImplementation(async ({ where }: { where: { userId: string; type: WalletType } }) => {
      const found = store.get(keyOf(where.userId, where.type));
      return found ? { ...found } : null;
    });
    txRepo.create.mockImplementation((dto: Partial<WalletEntity>) => ({ ...dto }) as WalletEntity);
    txRepo.save.mockImplementation(async (entity: WalletEntity) => {
      const clone = {
        ...entity,
        id: entity.id ?? `uuid-${Date.now()}-${Math.random()}`,
        createdAt: entity.createdAt ?? new Date(),
        updatedAt: new Date(),
      } as WalletEntity;
      store.set(keyOf(clone.userId, clone.type), clone);
      return clone;
    });
    walletRepo.find.mockImplementation(async ({ where }: { where: { userId?: string; type?: WalletType } }) => {
      const all = [...store.values()];
      return all
        .filter((w) => !where?.userId || w.userId === where.userId)
        .filter((w) => !where?.type || w.type === where.type)
        .sort((a, b) => (a.createdAt?.getTime?.() ?? 0) - (b.createdAt?.getTime?.() ?? 0));
    });
    walletRepo.findOneBy.mockImplementation(async ({ id }: { id: string }) => {
      const found = [...store.values()].find((w) => w.id === id);
      return found ? { ...found } : null;
    });
    let txQueue: Promise<void> = Promise.resolve();
    dataSource.transaction.mockImplementation((cb: (manager: EntityManager) => Promise<WalletEntity>) => {
      const manager = { getRepository: () => txRepo } as unknown as EntityManager;
      const run = () => cb(manager);
      const result = txQueue.then(run, run) as Promise<WalletEntity>;
      txQueue = result.then(
        () => undefined,
        () => undefined,
      );
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
      expect(store.get(keyOf(USER_ID, WalletType.E_WALLET))!.balance).toBe(100);
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

    it('403/400 khi rút quá số dư — Insufficient balance', async () => {
      store.set(
        keyOf(USER_ID, WalletType.E_WALLET),
        buildWallet({ balance: 30, userId: USER_ID, type: WalletType.E_WALLET }),
      );
      const res = await request(app.getHttpServer()).post('/wallet/withdraw').send({ amount: 50 }).expect(400);
      expect(res.body.message).toMatch(/Insufficient balance/i);
      expect(store.get(keyOf(USER_ID, WalletType.E_WALLET))!.balance).toBe(30);
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
  // Validation
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
      store.set(
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
  // Unauthorized (no guard override)
  // =========================================================================
  describe('Unauthorized — không có token/guard', () => {
    it('401 khi không có JWT', async () => {
      // appNoAuth dùng guard thật (AuthGuard jwt) không có token -> 401
      await request(appNoAuth.getHttpServer()).post('/wallet/deposit').send({ amount: 10 }).expect(401);
      await request(appNoAuth.getHttpServer()).get('/wallet').expect(401);
    });
  });
});
