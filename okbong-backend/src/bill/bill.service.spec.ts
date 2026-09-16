import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { roundAmount } from '../common/utils/amount.util';
import { BillStatus, BillType } from './dto/bill.dto';
import { BillEntity } from './entity/bill.entity';
import { BillService } from './bill.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
type MockBillRepo = {
  findAndCount: ReturnType<typeof vi.fn>;
  findOneBy: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
};

const USER_A = '00000000-0000-4000-a000-0000000000a1';
const USER_B = '00000000-0000-4000-a000-0000000000b1';

function buildBill(overrides: Partial<BillEntity> = {}): BillEntity {
  return {
    id: 'bill-' + Math.random().toString(36).slice(2, 8),
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

describe('BillService', () => {
  let service: BillService;
  let billRepo: MockBillRepo;

  beforeEach(async () => {
    billRepo = {
      findAndCount: vi.fn(),
      findOneBy: vi.fn(),
      create: vi.fn((dto: Partial<BillEntity>) => ({ ...dto }) as BillEntity),
      save: vi.fn(async (entity: BillEntity) => ({
        ...entity,
        id: entity.id ?? `uuid-${Date.now()}-${Math.random()}`,
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [BillService, { provide: getRepositoryToken(BillEntity), useValue: billRepo }],
    }).compile();

    service = module.get<BillService>(BillService);
  });

  afterEach(() => vi.clearAllMocks());

  // =========================================================================
  // create — trạng thái bắt buộc PENDING + roundAmount + description
  // =========================================================================
  describe('create', () => {
    it('tạo bill mới với status bắt buộc là PENDING dù input không có status', async () => {
      const dto = { userId: USER_A, amount: 250000, type: BillType.PAYMENT, description: 'Electricity 09/2026' };
      await service.create(dto);

      expect(billRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER_A,
          amount: roundAmount(250000),
          type: BillType.PAYMENT,
          status: BillStatus.PENDING,
          description: 'Electricity 09/2026',
        }),
      );
      expect(billRepo.save).toHaveBeenCalledTimes(1);
    });

    it('description = null nếu không truyền', async () => {
      await service.create({ userId: USER_A, amount: 100, type: BillType.RECURRING });
      expect(billRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ description: null, status: BillStatus.PENDING }),
      );
    });

    it('amount được làm tròn qua roundAmount (tránh floating-point)', async () => {
      // classic trap: 0.1 + 0.2 = 0.30000000000000004
      await service.create({ userId: USER_A, amount: 0.1 + 0.2, type: BillType.CHARGING });
      expect(billRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 0.3 }),
      );

      vi.clearAllMocks();
      await service.create({ userId: USER_A, amount: 1.005, type: BillType.PAYMENT });
      expect(billRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 1.01 }),
      );
    });

    it('luôn ép PENDING ngay cả khi repository mock trả về PENDING cứng', async () => {
      billRepo.save.mockImplementation(async (e: BillEntity) => ({ ...e, status: BillStatus.PENDING }));
      const result = await service.create({ userId: USER_A, amount: 50, type: BillType.PAYMENT });
      // create() sets PENDING before save, so saved entity must be PENDING
      expect(billRepo.create).toHaveBeenCalledWith(expect.objectContaining({ status: BillStatus.PENDING }));
      expect(result.status).toBe(BillStatus.PENDING);
    });

    it('trả về entity đã save', async () => {
      const saved = buildBill({ id: 'saved-1', amount: 123.45 });
      billRepo.save.mockResolvedValue(saved);
      const result = await service.create({ userId: USER_A, amount: 123.45, type: BillType.PAYMENT });
      expect(result).toBe(saved);
    });
  });

  // =========================================================================
  // update — PENDING -> PAID và PENDING -> CANCELLED (+ 404)
  // =========================================================================
  describe('update — chuyển trạng thái', () => {
    it('PENDING -> PAID (approved)', async () => {
      const bill = buildBill({ status: BillStatus.PENDING });
      billRepo.findOneBy.mockResolvedValue(bill);
      billRepo.save.mockImplementation(async (e: BillEntity) => ({ ...e }));

      const result = await service.update(bill.id, { status: BillStatus.PAID });

      expect(billRepo.findOneBy).toHaveBeenCalledWith({ id: bill.id });
      expect(result.status).toBe(BillStatus.PAID);
      expect(billRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: BillStatus.PAID }));
    });

    it('PENDING -> CANCELLED (rejected)', async () => {
      const bill = buildBill({ status: BillStatus.PENDING, description: 'old' });
      billRepo.findOneBy.mockResolvedValue(bill);
      billRepo.save.mockImplementation(async (e: BillEntity) => ({ ...e }));

      const result = await service.update(bill.id, { status: BillStatus.CANCELLED });

      expect(result.status).toBe(BillStatus.CANCELLED);
      expect(billRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: BillStatus.CANCELLED }));
    });

    it('cập nhật description độc lập với status', async () => {
      const bill = buildBill({ status: BillStatus.PENDING, description: 'old note' });
      billRepo.findOneBy.mockResolvedValue(bill);
      billRepo.save.mockImplementation(async (e: BillEntity) => ({ ...e }));

      const result = await service.update(bill.id, { description: 'new note' });
      expect(result.description).toBe('new note');
      expect(result.status).toBe(BillStatus.PENDING);
    });

    it('cập nhật đồng thời status và description', async () => {
      const bill = buildBill({ status: BillStatus.PENDING });
      billRepo.findOneBy.mockResolvedValue(bill);
      billRepo.save.mockImplementation(async (e: BillEntity) => ({ ...e }));

      const result = await service.update(bill.id, { status: BillStatus.PAID, description: 'approved by admin' });
      expect(result.status).toBe(BillStatus.PAID);
      expect(result.description).toBe('approved by admin');
    });

    it('bỏ qua patch rỗng — giữ nguyên entity', async () => {
      const bill = buildBill({ status: BillStatus.PENDING, description: 'keep' });
      billRepo.findOneBy.mockResolvedValue(bill);
      billRepo.save.mockImplementation(async (e: BillEntity) => ({ ...e }));

      const result = await service.update(bill.id, {});
      expect(result.status).toBe(BillStatus.PENDING);
      expect(result.description).toBe('keep');
    });

    it('throw 404 nếu bill không tồn tại khi update', async () => {
      billRepo.findOneBy.mockResolvedValue(null);
      await expect(service.update('missing-id', { status: BillStatus.PAID })).rejects.toThrow(NotFoundException);
      await expect(service.update('missing-id', { status: BillStatus.PAID })).rejects.toThrow(/was not found/);
      expect(billRepo.save).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // findOne — 404 khi không tìm thấy
  // =========================================================================
  describe('findOne', () => {
    it('trả về bill khi tìm thấy', async () => {
      const bill = buildBill({ id: 'found-1' });
      billRepo.findOneBy.mockResolvedValue(bill);
      const result = await service.findOne('found-1');
      expect(result).toBe(bill);
      expect(billRepo.findOneBy).toHaveBeenCalledWith({ id: 'found-1' });
    });

    it('throw NotFoundException (404) khi không tìm thấy', async () => {
      billRepo.findOneBy.mockResolvedValue(null);
      await expect(service.findOne('no-such-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('no-such-id')).rejects.toThrow(/no-such-id.*was not found/);
    });
  });

  // =========================================================================
  // findAll — phân trang và lọc theo userId, status, type
  // =========================================================================
  describe('findAll — phân trang & lọc', () => {
    it('mặc định page=1 limit=10 khi không truyền query', async () => {
      billRepo.findAndCount.mockResolvedValue([[], 0]);
      const result = await service.findAll({});

      expect(billRepo.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 10,
      });
      expect(result).toEqual({ items: [], total: 0 });
    });

    it('mặc định khi gọi không tham số', async () => {
      billRepo.findAndCount.mockResolvedValue([[], 0]);
      await service.findAll();
      expect(billRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
    });

    it('clamp page<=0 và limit<=0 về mặc định 1/10', async () => {
      billRepo.findAndCount.mockResolvedValue([[], 0]);
      await service.findAll({ page: 0, limit: -5 } as any);
      expect(billRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );

      await service.findAll({ page: -1, limit: 0 } as any);
      expect(billRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
    });

    it('tính skip/take đúng: page=3 limit=20 => skip=40 take=20', async () => {
      billRepo.findAndCount.mockResolvedValue([[], 0]);
      await service.findAll({ page: 3, limit: 20 });
      expect(billRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 40, take: 20 }),
      );
    });

    it('lọc theo userId', async () => {
      billRepo.findAndCount.mockResolvedValue([[], 0]);
      await service.findAll({ userId: USER_A });
      expect(billRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: USER_A } }),
      );
    });

    it('lọc theo status', async () => {
      billRepo.findAndCount.mockResolvedValue([[], 0]);
      await service.findAll({ status: BillStatus.PENDING });
      expect(billRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: BillStatus.PENDING } }),
      );
    });

    it('lọc theo type', async () => {
      billRepo.findAndCount.mockResolvedValue([[], 0]);
      await service.findAll({ type: BillType.PAYMENT });
      expect(billRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { type: BillType.PAYMENT } }),
      );
    });

    it('lọc kết hợp userId + status + type', async () => {
      billRepo.findAndCount.mockResolvedValue([[], 0]);
      await service.findAll({ userId: USER_B, status: BillStatus.PAID, type: BillType.CHARGING });
      expect(billRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: USER_B, status: BillStatus.PAID, type: BillType.CHARGING },
        }),
      );
    });

    it('lọc kết hợp với phân trang: skip/take vẫn đúng', async () => {
      const items = [buildBill(), buildBill()];
      billRepo.findAndCount.mockResolvedValue([items, 42]);
      const result = await service.findAll({ userId: USER_A, status: BillStatus.PENDING, page: 2, limit: 5 });

      expect(billRepo.findAndCount).toHaveBeenCalledWith({
        where: { userId: USER_A, status: BillStatus.PENDING },
        order: { createdAt: 'DESC' },
        skip: 5,
        take: 5,
      });
      expect(result).toEqual({ items, total: 42 });
    });

    it('trả về {items, total} và sắp xếp DESC theo createdAt', async () => {
      const items = [buildBill(), buildBill()];
      billRepo.findAndCount.mockResolvedValue([items, 2]);
      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.items).toBe(items);
      expect(result.total).toBe(2);
      expect(billRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ order: { createdAt: 'DESC' } }),
      );
    });
  });
});
