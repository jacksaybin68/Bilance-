import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Between } from 'typeorm';
import request from 'supertest';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtStrategy } from '../auth/jwt.strategy';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../enumeration/role.enum';
import { KycEntity, KYCStatus } from './entities/kyc.entity';
import { CreateKycDto, KycStatusUpdateDto, KycQueryDto } from './dto/kyc.dto';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';
import { QueueService } from '../queue/queue.service';
import { UserModule } from '../user/user.module';
import { forwardRef } from '@nestjs/common';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const USER_ID = '00000000-0000-4000-a000-000000000001';
const OTHER_USER = '00000000-0000-4000-a000-000000000002';
const ADMIN_ID = '00000000-0000-4000-a000-00000000ad01';

type MockKycRepo = {
  findOne: ReturnType<typeof vi.fn>;
  find: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
};

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function buildKyc(overrides: Partial<KycEntity> = {}): KycEntity {
  return {
    id: uuid(),
    userId: USER_ID,
    status: KYCStatus.PENDING,
    frontImage: null,
    backImage: null,
    selfieImage: null,
    idNumber: null,
    documentName: null,
    rejectReason: null,
    reviewedBy: null,
    submittedAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  } as KycEntity;
}

// ---------------------------------------------------------------------------
// Fake UserModule forwardRef để tránh lỗi DI khi compile test module
// (KycService Inject forwardRef(() => UserModule) — trong E2E không cần real user logic)
// ---------------------------------------------------------------------------
const MockUserModule = {
  provide: UserModule,
  useValue: {},
};

describe('KYC E2E — Submit & Admin Approve', () => {
  let appAdmin: INestApplication;
  let appUser: INestApplication;
  let appNoAuth: INestApplication;
  let kycRepo: MockKycRepo;
  let kycStore: Map<string, KycEntity>;

  beforeAll(async () => {
    kycStore = new Map<string, KycEntity>();

    kycRepo = {
      findOne: vi.fn(async ({ where }: { where: { id?: string; userId?: string; status?: KYCStatus } }) => {
        const found = [...kycStore.values()].find(
          (k) =>
            (!where.id || k.id === where.id) &&
            (!where.userId || k.userId === where.userId) &&
            (!where.status || k.status === where.status),
        );
        return found ? { ...found } : null;
      }),
      find: vi.fn(async ({ where, order }: { where?: Record<string, unknown>; order?: Record<string, string> }) => {
        let items = [...kycStore.values()];
        if (where?.status !== undefined) items = items.filter((k) => k.status === where.status);
        if (order?.submittedAt === 'DESC') items.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
        return items;
      }),
      create: vi.fn((dto: Partial<KycEntity>) => ({ ...dto }) as KycEntity),
      save: vi.fn(async (entity: KycEntity) => {
        const clone = {
          ...entity,
          id: entity.id ?? uuid(),
          submittedAt: entity.submittedAt ?? new Date(),
          updatedAt: new Date(),
        } as KycEntity;
        kycStore.set(clone.id, clone);
        return clone;
      }),
    };

    const adminUser = { id: ADMIN_ID, email: 'admin@test.com', role: Role.ADMIN };
    const normalUser = { id: USER_ID, email: 'user@test.com', role: Role.USER };

    // Mock UserModule forwardRef để tránh lỗi Inject
    const mockUserModule = { provide: UserModule, useValue: {} };

    // ---- Admin app: JwtAuthGuard + RolesGuard hoạt động, user = admin ----
    const adminModule = await Test.createTestingModule({
      controllers: [KycController],
      providers: [
        KycService,
        { provide: getRepositoryToken(KycEntity), useValue: kycRepo },
        { provide: QueueService, useValue: { add: vi.fn().mockResolvedValue({ id: 'job' }) } },
        mockUserModule,
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
          // Admin routes yêu cầu ADMIN hoặc SUPER_ADMIN
          return user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;
        },
      })
      .compile();

    appAdmin = adminModule.createNestApplication();
    appAdmin.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        validationError: { target: false, value: false },
      }),
    );
    await appAdmin.init();

    // ---- User app: USER role, sẽ bị 403 trên các route admin ----
    const userModule = await Test.createTestingModule({
      controllers: [KycController],
      providers: [
        KycService,
        { provide: getRepositoryToken(KycEntity), useValue: kycRepo },
        { provide: QueueService, useValue: { add: vi.fn().mockResolvedValue({ id: 'job' }) } },
        mockUserModule,
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
          if (!user) return false;
          return user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;
        },
      })
      .compile();

    appUser = userModule.createNestApplication();
    appUser.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        validationError: { target: false, value: false },
      }),
    );
    await appUser.init();

    // ---- NoAuth app: dùng guard thật (không override), không có token → 401 ----
    const noAuthModule = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers: [KycController],
      providers: [
        KycService,
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: { get: (_key: string, def?: string) => def ?? 'okbong-secret-key' },
        },
        { provide: getRepositoryToken(KycEntity), useValue: kycRepo },
        { provide: QueueService, useValue: { add: vi.fn().mockResolvedValue({ id: 'job' }) } },
        { provide: UserModule, useValue: {} },
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
  });

  afterAll(async () => {
    await appAdmin.close();
    await appUser.close();
    await appNoAuth.close();
  });

  beforeEach(() => {
    kycStore.clear();
    vi.clearAllMocks();
    // Re-attach mock implementations cleared by clearAllMocks
    kycRepo.findOne.mockImplementation(async ({ where }: { where: { id?: string; userId?: string; status?: KYCStatus } }) => {
      const found = [...kycStore.values()].find(
        (k) =>
          (!where.id || k.id === where.id) &&
          (!where.userId || k.userId === where.userId) &&
          (!where.status || k.status === where.status),
      );
      return found ? { ...found } : null;
    });
    kycRepo.find.mockImplementation(async ({ where, order }: { where?: Record<string, unknown>; order?: Record<string, string> }) => {
      let items = [...kycStore.values()];
      if (where?.status !== undefined) items = items.filter((k) => k.status === where.status);
      // Không xử lý Between ở đây vì trong E2E thường query thẳng repository với where đơn giản
      if (order?.submittedAt === 'DESC') items.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
      return items;
    });
    kycRepo.create.mockImplementation((dto: Partial<KycEntity>) => ({ ...dto }) as KycEntity);
    kycRepo.save.mockImplementation(async (entity: KycEntity) => {
      const clone = {
        ...entity,
        id: entity.id ?? uuid(),
        submittedAt: entity.submittedAt ?? new Date(),
        updatedAt: new Date(),
      } as KycEntity;
      kycStore.set(clone.id, clone);
      return clone;
    });
  });

  // =========================================================================
  // POST /kyc — Submit KYC (USER)
  // =========================================================================
  describe('POST /kyc — Submit KYC (USER)', () => {
    it('201: submit KYC thành công, status = PENDING', async () => {
      const dto: CreateKycDto = {
        frontImage: 'https://cdn.test/front.jpg',
        backImage: 'https://cdn.test/back.jpg',
        selfieImage: 'https://cdn.test/selfie.jpg',
        idNumber: '123456789',
        documentName: 'CCCD',
      };
      const res = await request(appAdmin.getHttpServer()).post('/kyc').send(dto).expect(201);
      expect(res.body.status).toBe(KYCStatus.PENDING);
      expect(res.body.userId).toBe(ADMIN_ID);
      expect(res.body.frontImage).toBe('https://cdn.test/front.jpg');
      expect(res.body.idNumber).toBe('123456789');
    });

    it('frontImage/backImage/selfieImage/idNumber/documentName = null khi không truyền', async () => {
      const res = await request(appAdmin.getHttpServer())
        .post('/kyc')
        .send({})
        .expect(201);
      expect(res.body.frontImage).toBeNull();
      expect(res.body.backImage).toBeNull();
      expect(res.body.selfieImage).toBeNull();
      expect(res.body.idNumber).toBeNull();
      expect(res.body.documentName).toBeNull();
    });

    it('400: submit KYC khi user đã có pending → duplicate error', async () => {
      kycStore.set(
        uuid(),
        buildKyc({ userId: ADMIN_ID, status: KYCStatus.PENDING }),
      );
      await request(appAdmin.getHttpServer())
        .post('/kyc')
        .send({ frontImage: 'https://cdn.test/new-front.jpg' })
        .expect(400);
    });

    it('bỏ qua userId trong body — luôn dùng user từ token', async () => {
      const res = await request(appAdmin.getHttpServer())
        .post('/kyc')
        .send({ userId: OTHER_USER, frontImage: 'https://cdn.test/img.jpg' })
        .expect(201);
      expect(res.body.userId).toBe(ADMIN_ID);
      expect(kycStore.has(res.body.id)).toBe(true);
    });
  });

  // =========================================================================
  // GET /kyc — List KYC (ADMIN)
  // =========================================================================
  describe('GET /kyc — Danh sách KYC (ADMIN)', () => {
    beforeEach(async () => {
      kycStore.set(
        'kyc-1',
        buildKyc({ userId: USER_ID, status: KYCStatus.PENDING, submittedAt: new Date('2026-01-10') }),
      );
      kycStore.set(
        'kyc-2',
        buildKyc({ userId: OTHER_USER, status: KYCStatus.UNDER_REVIEW, submittedAt: new Date('2026-02-10') }),
      );
      kycStore.set(
        'kyc-3',
        buildKyc({ userId: USER_ID, status: KYCStatus.APPROVED, submittedAt: new Date('2026-03-10') }),
      );
    });

    it('200: trả về tất cả KYC, mặc định sort DESC theo submittedAt', async () => {
      const res = await request(appAdmin.getHttpServer()).get('/kyc').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(3);
      // Phần tử đầu tiên phải là mới nhất
      expect(Date.parse(res.body[0].submittedAt)).toBeGreaterThanOrEqual(Date.parse(res.body[1].submittedAt));
    });

    it('lọc theo status=PENDING', async () => {
      const res = await request(appAdmin.getHttpServer())
        .get('/kyc')
        .query({ status: KYCStatus.PENDING })
        .expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].status).toBe(KYCStatus.PENDING);
    });

    it('lọc theo status=UNDER_REVIEW', async () => {
      const res = await request(appAdmin.getHttpServer())
        .get('/kyc')
        .query({ status: KYCStatus.UNDER_REVIEW })
        .expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].userId).toBe(OTHER_USER);
    });

    it('lọc theo status=APPROVED', async () => {
      const res = await request(appAdmin.getHttpServer())
        .get('/kyc')
        .query({ status: KYCStatus.APPROVED })
        .expect(200);
      expect(res.body).toHaveLength(1);
    });
  });

  // =========================================================================
  // GET /kyc/:id — Tìm KYC theo ID (ADMIN)
  // =========================================================================
  describe('GET /kyc/:id — Tìm KYC theo ID (ADMIN)', () => {
    it('200: tìm thấy KYC', async () => {
      const kyc = buildKyc({ userId: USER_ID });
      kycStore.set(kyc.id, kyc);
      const res = await request(appAdmin.getHttpServer()).get(`/kyc/${kyc.id}`).expect(200);
      expect(res.body.id).toBe(kyc.id);
      expect(res.body.userId).toBe(USER_ID);
    });

    it('404: KYC không tồn tại', async () => {
      await request(appAdmin.getHttpServer())
        .get('/kyc/00000000-0000-4000-a000-00000000ffff')
        .expect(404);
    });

    it('400: id không phải UUID', async () => {
      await request(appAdmin.getHttpServer()).get('/kyc/not-a-uuid').expect(400);
    });
  });

  // =========================================================================
  // POST /kyc/:id/status — Cập nhật trạng thái KYC (ADMIN)
  // =========================================================================
  describe('POST /kyc/:id/status — Duyệt KYC (ADMIN)', () => {
    it('PENDING → APPROVED: admin approve', async () => {
      const kyc = buildKyc({ status: KYCStatus.PENDING });
      kycStore.set(kyc.id, kyc);

      const dto: KycStatusUpdateDto = { status: KYCStatus.APPROVED };
      const res = await request(appAdmin.getHttpServer())
        .post(`/kyc/${kyc.id}/status`)
        .send(dto)
        .expect(201);

      expect(res.body.status).toBe(KYCStatus.APPROVED);
      expect(res.body.reviewedBy).toBe(ADMIN_ID);
      expect(res.body.rejectReason).toBeNull();
    });

    it('PENDING → APPROVED + rejectReason khi reject', async () => {
      const kyc = buildKyc({ status: KYCStatus.PENDING });
      kycStore.set(kyc.id, kyc);

      const dto: KycStatusUpdateDto = {
        status: KYCStatus.REJECTED,
        rejectReason: 'Sai thông tin identity',
      };
      const res = await request(appAdmin.getHttpServer())
        .post(`/kyc/${kyc.id}/status`)
        .send(dto)
        .expect(201);

      expect(res.body.status).toBe(KYCStatus.REJECTED);
      expect(res.body.rejectReason).toBe('Sai thông tin identity');
      expect(res.body.reviewedBy).toBe(ADMIN_ID);
    });

    it('UNDER_REVIEW → APPROVED', async () => {
      const kyc = buildKyc({ status: KYCStatus.UNDER_REVIEW });
      kycStore.set(kyc.id, kyc);

      const dto: KycStatusUpdateDto = { status: KYCStatus.APPROVED };
      const res = await request(appAdmin.getHttpServer())
        .post(`/kyc/${kyc.id}/status`)
        .send(dto)
        .expect(201);

      expect(res.body.status).toBe(KYCStatus.APPROVED);
    });

    it('400: không thể cập nhật từ status APPROVED (không hợp lệ)', async () => {
      const kyc = buildKyc({ status: KYCStatus.APPROVED });
      kycStore.set(kyc.id, kyc);

      await request(appAdmin.getHttpServer())
        .post(`/kyc/${kyc.id}/status`)
        .send({ status: KYCStatus.REJECTED })
        .expect(400);
    });

    it('400: không thể cập nhật từ status REJECTED', async () => {
      const kyc = buildKyc({ status: KYCStatus.REJECTED });
      kycStore.set(kyc.id, kyc);

      await request(appAdmin.getHttpServer())
        .post(`/kyc/${kyc.id}/status`)
        .send({ status: KYCStatus.APPROVED })
        .expect(400);
    });

    it('400: status không hợp lệ (không thuộc enum)', async () => {
      const kyc = buildKyc();
      kycStore.set(kyc.id, kyc);
      await request(appAdmin.getHttpServer())
        .post(`/kyc/${kyc.id}/status`)
        .send({ status: 'invalid_status' })
        .expect(400);
    });

    it('404: KYC không tồn tại', async () => {
      await request(appAdmin.getHttpServer())
        .post('/kyc/00000000-0000-4000-a000-00000000ffff/status')
        .send({ status: KYCStatus.APPROVED })
        .expect(404);
    });

    it('400: id không phải UUID', async () => {
      await request(appAdmin.getHttpServer())
        .post('/kyc/not-uuid/status')
        .send({ status: KYCStatus.APPROVED })
        .expect(400);
    });
  });

  // =========================================================================
  // Phân quyền — USER bị 403, NoAuth bị 401
  // =========================================================================
  describe('Phân quyền — USER 403, NoAuth 401', () => {
    it('USER POST /kyc → 201 (route này chỉ guard JwtAuthGuard, không RolesGuard)', async () => {
      const res = await request(appUser.getHttpServer())
        .post('/kyc')
        .send({ userId: OTHER_USER, frontImage: 'https://cdn.test/front.jpg' })
        .expect(201);
      expect(res.body.status).toBe(KYCStatus.PENDING);
      expect(res.body.userId).toBe(USER_ID);
    });

    it('USER GET /kyc → 403 (route này có @Roles(ADMIN) + RolesGuard)', async () => {
      await request(appUser.getHttpServer()).get('/kyc').expect(403);
    });

    it('USER GET /kyc/:id → 403', async () => {
      const kyc = buildKyc();
      kycStore.set(kyc.id, kyc);
      await request(appUser.getHttpServer()).get(`/kyc/${kyc.id}`).expect(403);
    });

    it('USER POST /kyc/:id/status → 403', async () => {
      const kyc = buildKyc({ status: KYCStatus.PENDING });
      kycStore.set(kyc.id, kyc);
      await request(appUser.getHttpServer())
        .post(`/kyc/${kyc.id}/status`)
        .send({ status: KYCStatus.APPROVED })
        .expect(403);
    });

    it('NoAuth POST /kyc → 401 (chỉ guard JwtAuthGuard, không override)', async () => {
      await request(appNoAuth.getHttpServer()).post('/kyc').send({ userId: USER_ID }).expect(401);
    });

    it('NoAuth GET /kyc → 401 (RolesGuard cũng chặn, nhưng JwtAuthGuard trước đó đã 401)', async () => {
      await request(appNoAuth.getHttpServer()).get('/kyc').expect(401);
    });

    it('NoAuth GET /kyc/:id → 401', async () => {
      await request(appNoAuth.getHttpServer()).get('/kyc/some-id').expect(401);
    });

    it('NoAuth POST /kyc/:id/status → 401', async () => {
      await request(appNoAuth.getHttpServer())
        .post('/kyc/some-id/status')
        .send({ status: KYCStatus.APPROVED })
        .expect(401);
    });
  });
});
