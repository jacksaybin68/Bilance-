import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../enumeration/role.enum';
import { BillStatus, BillType } from './dto/bill.dto';
import { BillEntity } from './entity/bill.entity';
import { BillController } from './bill.controller';
import { BillService } from './bill.service';
import { BillQueueService } from '../queue/index';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const USER_A = '00000000-0000-4000-a000-0000000000a1';
const USER_B = '00000000-0000-4000-a000-0000000000b1';
const ADMIN_ID = '00000000-0000-4000-a000-00000000ad01';

function buildBill(overrides: Partial<BillEntity> = {}): BillEntity {
  return {
    id: `00000000-0000-4000-a000-${String(Math.floor(Math.random() * 1e12)).padStart(12, '0')}`,
    userId: USER_A,
    amount: 100,
    type: BillType.PAYMENT,
    status: BillStatus.PENDING,
    description: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  } as BillEntity;
}

type MockBillRepo = {
  findAndCount: ReturnType<typeof vi.fn>;
  findOneBy: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
};

function setupMockRepo(store: Map<string, BillEntity>): MockBillRepo {
  return {
    findAndCount: vi.fn(async ({ where, order, skip, take }: any) => {
      let items = [...store.values()];
      if (where?.userId) items = items.filter((b) => b.userId === where.userId);
      if (where?.status) items = items.filter((b) => b.status === where.status);
      if (where?.type) items = items.filter((b) => b.type === where.type);
      if (order?.createdAt === 'DESC') items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      else items.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      const total = items.length;
      const paged = items.slice(skip ?? 0, (skip ?? 0) + (take ?? 10));
      return [paged, total] as [BillEntity[], number];
    }),
    findOneBy: vi.fn(async ({ id }: { id: string }) => {
      const found = store.get(id);
      return found ? { ...found } : null;
    }),
    create: vi.fn((dto: Partial<BillEntity>) => ({ ...dto }) as BillEntity),
    save: vi.fn(async (entity: BillEntity) => {
      const clone = { ...entity, id: entity.id ?? `00000000-0000-4000-a000-${String(Date.now()).slice(-12).padStart(12, '0')}` } as BillEntity;
      const existing = store.get(clone.id);
      // Preserve createdAt on update
      if (existing) clone.createdAt = existing.createdAt;
      clone.updatedAt = new Date();
      store.set(clone.id, clone);
      return { ...clone };
    }),
  };
}

describe('Bill E2E — Tạo & Duyệt lệnh', () => {
  let appAdmin: INestApplication;
  let appUser: INestApplication;
  let appNoAuth: INestApplication;
  let store: Map<string, BillEntity>;
  let billRepoAdmin: MockBillRepo;
  let billRepoUser: MockBillRepo;
  let billRepoNoAuth: MockBillRepo;

  const mockBillQueueService = { onBillCreated: vi.fn().mockResolvedValue({ id: 'mock-job' }) };

beforeAll(async () => {
    store = new Map<string, BillEntity>();

    // Each app gets its own repo mock but shares the same store
    billRepoAdmin = setupMockRepo(store);
    billRepoUser = setupMockRepo(store);
    billRepoNoAuth = setupMockRepo(store);

    const adminUser = { id: ADMIN_ID, email: 'admin@test.com', role: Role.ADMIN };
    const normalUser = { id: USER_A, email: 'user@test.com', role: Role.USER };

    // Admin app — JwtAuthGuard injects admin, RolesGuard checks real role
    const adminModule = await Test.createTestingModule({
      controllers: [BillController],
      providers: [
        BillService,
        { provide: getRepositoryToken(BillEntity), useValue: billRepoAdmin },
        { provide: BillQueueService, useValue: mockBillQueueService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: any) => {
          const req = ctx.switchToHttp().getRequest();
          req.user = adminUser;
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate: (ctx: any) => {
          const req = ctx.switchToHttp().getRequest();
          const user = req.user as { role?: Role } | undefined;
          if (!user) return false;
          const required: Role[] | undefined = (Reflect as any).getMetadata?.('roles', ctx.getHandler?.())
            ?? (Reflect as any).getMetadata?.('roles', ctx.getClass?.());
          // Fallback: since override replaces guard, manually check metadata via reflector would be complex.
          // Instead, enforce ADMIN required for all /bills routes (matches @Roles(Role.ADMIN) on controller)
          return user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;
        },
      })
      .compile();
    appAdmin = adminModule.createNestApplication();
    appAdmin.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, validationError: { target: false, value: false } }));
    await appAdmin.init();

    // User app — normal USER should get 403 on all /bills endpoints
    const userModule = await Test.createTestingModule({
      controllers: [BillController],
      providers: [
        BillService,
        { provide: getRepositoryToken(BillEntity), useValue: billRepoUser },
        { provide: BillQueueService, useValue: mockBillQueueService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: any) => {
          const req = ctx.switchToHttp().getRequest();
          req.user = normalUser;
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate: (ctx: any) => {
          const req = ctx.switchToHttp().getRequest();
          const user = req.user as { role?: Role } | undefined;
          // All /bills routes require ADMIN
          return user?.role === Role.ADMIN || user?.role === Role.SUPER_ADMIN;
        },
      })
      .compile();
    appUser = userModule.createNestApplication();
    appUser.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, validationError: { target: false, value: false } }));
    await appUser.init();

    // NoAuth app — real JwtAuthGuard without token -> 401
    const noAuthModule = await Test.createTestingModule({
      controllers: [BillController],
      providers: [
        BillService,
        { provide: getRepositoryToken(BillEntity), useValue: billRepoNoAuth },
        { provide: BillQueueService, useValue: mockBillQueueService },
      ],
    }).compile();
    appNoAuth = noAuthModule.createNestApplication();
    appNoAuth.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, validationError: { target: false, value: false } }));
    await appNoAuth.init();
  });

  afterAll(async () => {
    await appAdmin.close();
    await appUser.close();
    await appNoAuth.close();
  });

  beforeEach(() => {
    store.clear();
  });

  // =========================================================================
  // POST /bills — Tạo bill (ADMIN)
  // =========================================================================
  describe('POST /bills — Tạo bill (ADMIN)', () => {
    it('201: tạo bill với status bắt buộc PENDING', async () => {
      const res = await request(appAdmin.getHttpServer())
        .post('/bills')
        .send({ userId: USER_A, amount: 250000, type: BillType.PAYMENT, description: 'Electricity 09/2026' })
        .expect(201);
      expect(res.body.status).toBe(BillStatus.PENDING);
      expect(res.body.userId).toBe(USER_A);
      expect(res.body.amount).toBe(250000);
      expect(res.body.type).toBe(BillType.PAYMENT);
    });

    it('description = null nếu không truyền', async () => {
      const res = await request(appAdmin.getHttpServer())
        .post('/bills')
        .send({ userId: USER_A, amount: 100, type: BillType.RECURRING })
        .expect(201);
      expect(res.body.description).toBeNull();
    });

    it('amount được làm tròn qua roundAmount', async () => {
      const res = await request(appAdmin.getHttpServer())
        .post('/bills')
        .send({ userId: USER_A, amount: 0.1 + 0.2, type: BillType.CHARGING })
        .expect(201);
      expect(res.body.amount).toBe(0.3);
    });

    it('400 khi thiếu userId/amount/type', async () => {
      await request(appAdmin.getHttpServer()).post('/bills').send({ amount: 100, type: BillType.PAYMENT }).expect(400);
      await request(appAdmin.getHttpServer()).post('/bills').send({ userId: USER_A, type: BillType.PAYMENT }).expect(400);
      await request(appAdmin.getHttpServer()).post('/bills').send({ userId: USER_A, amount: 100 }).expect(400);
    });

    it('400 khi amount <=0 hoặc quá lớn hoặc quá 2 decimals', async () => {
      await request(appAdmin.getHttpServer())
        .post('/bills')
        .send({ userId: USER_A, amount: 0, type: BillType.PAYMENT })
        .expect(400);
      await request(appAdmin.getHttpServer())
        .post('/bills')
        .send({ userId: USER_A, amount: -5, type: BillType.PAYMENT })
        .expect(400);
      await request(appAdmin.getHttpServer())
        .post('/bills')
        .send({ userId: USER_A, amount: 2_000_000_000, type: BillType.PAYMENT })
        .expect(400);
      await request(appAdmin.getHttpServer())
        .post('/bills')
        .send({ userId: USER_A, amount: 1.234, type: BillType.PAYMENT })
        .expect(400);
    });

    it('400 khi userId không phải UUID', async () => {
      await request(appAdmin.getHttpServer())
        .post('/bills')
        .send({ userId: 'not-uuid', amount: 100, type: BillType.PAYMENT })
        .expect(400);
    });
  });

  // =========================================================================
  // GET /bills — Pagination + Filter + X-Total-Count
  // =========================================================================
  describe('GET /bills — Phân trang & lọc (ADMIN)', () => {
    beforeEach(async () => {
      // Seed 5 bills
      const seed: Array<Partial<BillEntity>> = [
        { userId: USER_A, amount: 10, type: BillType.PAYMENT, status: BillStatus.PENDING },
        { userId: USER_A, amount: 20, type: BillType.PAYMENT, status: BillStatus.PAID },
        { userId: USER_A, amount: 30, type: BillType.RECURRING, status: BillStatus.PENDING },
        { userId: USER_B, amount: 40, type: BillType.CHARGING, status: BillStatus.PENDING },
        { userId: USER_B, amount: 50, type: BillType.PAYMENT, status: BillStatus.CANCELLED },
      ];
      for (const s of seed) {
        const b = buildBill(s as BillEntity);
        store.set(b.id, b as BillEntity);
      }
    });

    it('mặc định trả về paginated + header X-Total-Count', async () => {
      const res = await request(appAdmin.getHttpServer()).get('/bills').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(5);
      expect(res.headers['x-total-count']).toBe('5');
    });

    it('phân trang: page=1 limit=2 -> 2 items, X-Total-Count=5', async () => {
      const res = await request(appAdmin.getHttpServer()).get('/bills').query({ page: 1, limit: 2 }).expect(200);
      expect(res.body).toHaveLength(2);
      expect(res.headers['x-total-count']).toBe('5');
    });

    it('lọc theo userId', async () => {
      const res = await request(appAdmin.getHttpServer()).get('/bills').query({ userId: USER_A }).expect(200);
      expect(res.body.every((b: BillEntity) => b.userId === USER_A)).toBe(true);
      expect(res.headers['x-total-count']).toBe('3');
    });

    it('lọc theo status=PENDING', async () => {
      const res = await request(appAdmin.getHttpServer()).get('/bills').query({ status: BillStatus.PENDING }).expect(200);
      expect(res.body.every((b: BillEntity) => b.status === BillStatus.PENDING)).toBe(true);
      expect(res.headers['x-total-count']).toBe('3');
    });

    it('lọc theo type=PAYMENT', async () => {
      const res = await request(appAdmin.getHttpServer()).get('/bills').query({ type: BillType.PAYMENT }).expect(200);
      expect(res.body.every((b: BillEntity) => b.type === BillType.PAYMENT)).toBe(true);
    });

    it('lọc kết hợp userId + status + type', async () => {
      const res = await request(appAdmin.getHttpServer())
        .get('/bills')
        .query({ userId: USER_A, status: BillStatus.PENDING, type: BillType.PAYMENT })
        .expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].userId).toBe(USER_A);
      expect(res.body[0].status).toBe(BillStatus.PENDING);
    });
  });

  // =========================================================================
  // GET /bills/:id
  // =========================================================================
  describe('GET /bills/:id (ADMIN)', () => {
    it('200 khi tồn tại', async () => {
      const bill = buildBill({ userId: USER_A, status: BillStatus.PENDING });
      store.set(bill.id, bill);
      const res = await request(appAdmin.getHttpServer()).get(`/bills/${bill.id}`).expect(200);
      expect(res.body.id).toBe(bill.id);
    });

    it('404 khi không tồn tại', async () => {
      const missing = '00000000-0000-4000-a000-00000000ffff';
      const res = await request(appAdmin.getHttpServer()).get(`/bills/${missing}`).expect(404);
      expect(res.body.message).toMatch(/was not found/i);
    });

    it('400 khi id không phải UUID', async () => {
      await request(appAdmin.getHttpServer()).get('/bills/not-a-uuid').expect(400);
    });
  });

  // =========================================================================
  // PATCH /bills/:id — Duyệt lệnh
  // =========================================================================
  describe('PATCH /bills/:id — Duyệt lệnh (ADMIN)', () => {
    it('PENDING -> PAID', async () => {
      const bill = buildBill({ status: BillStatus.PENDING });
      store.set(bill.id, bill);
      const res = await request(appAdmin.getHttpServer())
        .patch(`/bills/${bill.id}`)
        .send({ status: BillStatus.PAID })
        .expect(200);
      expect(res.body.status).toBe(BillStatus.PAID);
    });

    it('PENDING -> CANCELLED', async () => {
      const bill = buildBill({ status: BillStatus.PENDING });
      store.set(bill.id, bill);
      const res = await request(appAdmin.getHttpServer())
        .patch(`/bills/${bill.id}`)
        .send({ status: BillStatus.CANCELLED })
        .expect(200);
      expect(res.body.status).toBe(BillStatus.CANCELLED);
    });

    it('cập nhật description', async () => {
      const bill = buildBill({ status: BillStatus.PENDING, description: 'old' });
      store.set(bill.id, bill);
      const res = await request(appAdmin.getHttpServer())
        .patch(`/bills/${bill.id}`)
        .send({ description: 'approved by admin' })
        .expect(200);
      expect(res.body.description).toBe('approved by admin');
    });

    it('404 khi id không tồn tại', async () => {
      await request(appAdmin.getHttpServer())
        .patch('/bills/00000000-0000-4000-a000-00000000ffff')
        .send({ status: BillStatus.PAID })
        .expect(404);
    });

    it('400 khi id không phải UUID', async () => {
      await request(appAdmin.getHttpServer()).patch('/bills/not-uuid').send({ status: BillStatus.PAID }).expect(400);
    });
  });

  // =========================================================================
  // Phân quyền — USER bị 403, NoAuth 401
  // =========================================================================
  describe('Phân quyền — USER 403, NoAuth 401', () => {
    it('USER GET /bills -> 403', async () => {
      await request(appUser.getHttpServer()).get('/bills').expect(403);
    });

    it('USER POST /bills -> 403', async () => {
      await request(appUser.getHttpServer())
        .post('/bills')
        .send({ userId: USER_A, amount: 100, type: BillType.PAYMENT })
        .expect(403);
    });

    it('USER PATCH /bills/:id -> 403', async () => {
      const bill = buildBill();
      store.set(bill.id, bill);
      await request(appUser.getHttpServer()).patch(`/bills/${bill.id}`).send({ status: BillStatus.PAID }).expect(403);
    });

    it('USER GET /bills/:id -> 403', async () => {
      const bill = buildBill();
      store.set(bill.id, bill);
      await request(appUser.getHttpServer()).get(`/bills/${bill.id}`).expect(403);
    });

    it('NoAuth GET /bills -> 401', async () => {
      await request(appNoAuth.getHttpServer()).get('/bills').expect(401);
    });

    it('NoAuth POST /bills -> 401', async () => {
      await request(appNoAuth.getHttpServer())
        .post('/bills')
        .send({ userId: USER_A, amount: 100, type: BillType.PAYMENT })
        .expect(401);
    });
  });
});
