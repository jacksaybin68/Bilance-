import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KycEntity, KYCStatus } from './entities/kyc.entity';
import { CreateKycDto, KycStatusUpdateDto, KycQueryDto } from './dto/kyc.dto';
import { KycService } from './kyc.service';
import { QueueService } from '../queue/queue.service';
import { WalletType } from '../wallet/dto/wallet.dto';

const USER_ID = '00000000-0000-4000-a000-000000000001';
const REVIEWER_ID = '00000000-0000-4000-a000-000000000002';

function makeKyc(overrides: Partial<KycEntity> = {}): KycEntity {
  return {
    id: 'kyc-' + Math.random().toString(36).slice(2, 10),
    userId: USER_ID,
    status: KYCStatus.PENDING,
    frontImage: null,
    backImage: null,
    selfieImage: null,
    idNumber: null,
    documentName: null,
    rejectReason: null,
    reviewedBy: null,
    submittedAt: new Date('2026-09-16T00:00:00Z'),
    updatedAt: new Date('2026-09-16T00:00:00Z'),
    ...overrides,
  } as KycEntity;
}

interface MockKycRepo {
  findOne: ReturnType<typeof vi.fn>;
  find: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
}

vi.mock('okbong-lib/config', () => ({
  config: {
    kycProcessUrl: 'https://kyc-process.test/api/v1/submit',
    kycProcessToken: 'test-token',
  },
}));

describe('KycService', () => {
  let service: KycService;
  let repo: MockKycRepo;
  let queue: QueueService;

  beforeEach(async () => {
    repo = {
      findOne: vi.fn(),
      find: vi.fn(),
      create: vi.fn((dto: Partial<KycEntity>) => ({ ...dto } as KycEntity)),
      save: vi.fn(async (e: KycEntity) => e),
      count: vi.fn(),
    } as unknown as MockKycRepo;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KycService,
        { provide: getRepositoryToken(KycEntity), useValue: repo },
        {
          provide: QueueService,
          useValue: { add: vi.fn().mockResolvedValue({ id: 'mock-job' }) },
        },
      ],
    }).compile();

    service = module.get<KycService>(KycService);
    queue = module.get<QueueService>(QueueService);
  });

  afterEach(() => vi.clearAllMocks());

  // =========================================================================
  // create — validation + thông báo pending
  // =========================================================================
  describe('create', () => {
    it('tạo KYC Pending với userId và không có ảnh', async () => {
      const dto: CreateKycDto = { userId: USER_ID };
      const saved = makeKyc({ id: 'new-1' });

      repo.save.mockResolvedValue(saved);
      const result = await service.create(dto);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER_ID,
          frontImage: null,
          backImage: null,
          selfieImage: null,
          idNumber: null,
          documentName: null,
          status: KYCStatus.PENDING,
        }),
      );
      expect(repo.save).toHaveBeenCalledTimes(1);
      expect(result).toBe(saved);
      expect(result.status).toBe(KYCStatus.PENDING);
    });

    it('không cho submit khi đã có KYC PENDING cho user đó', async () => {
      repo.findOne.mockResolvedValue(makeKyc({ userId: USER_ID, status: KYCStatus.PENDING }));
      const dto: CreateKycDto = { userId: USER_ID };

      await expect(service.create(dto)).rejects.toThrow(
        'A pending KYC submission already exists for this user',
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('chấp nhận frontImage / backImage / selfieImage dạng URL HTTPS', async () => {
      const dto: CreateKycDto = {
        userId: USER_ID,
        frontImage: 'https://example.com/front.jpg',
        backImage: 'https://example.com/back.png',
        selfieImage: 'https://example.com/selfie.webp',
      };
      const saved = makeKyc({ id: 'img-1' });
      repo.save.mockResolvedValue(saved);

      const result = await service.create(dto);
      expect(result).toBe(saved);
    });

    it('chấp nhận ảnh base64 hợp lệ (mime + size trong giới hạn)', async () => {
      const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const dto: CreateKycDto = {
        userId: USER_ID,
        frontImage: tinyPng,
      };
      const saved = makeKyc({ id: 'b64-1' });
      repo.save.mockResolvedValue(saved);

      const result = await service.create(dto);
      expect(result).toBe(saved);
    });

    it('từ chối ảnh base64 MIME không nằm trong whitelist', async () => {
      const gif = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
      const dto: CreateKycDto = { userId: USER_ID, frontImage: gif };

      await expect(service.create(dto)).rejects.toThrow(
        'frontImage must be one of: image/jpeg, image/png, image/webp',
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('từ chối ảnh base64 vượt quá giới hạn 5 MB', async () => {
      const big = 'data:image/jpeg;base64,' + 'A'.repeat(7_400_000);
      const dto: CreateKycDto = { userId: USER_ID, frontImage: big };

      await expect(service.create(dto)).rejects.toThrow(
        'frontImage exceeds the maximum image size of 5 MB',
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('từ chối data URI sai định dạng (không có phần data)', async () => {
      const dto: CreateKycDto = { userId: USER_ID, frontImage: 'data:invalid' };
      await expect(service.create(dto)).rejects.toThrow('is not a valid data URI');
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('từ chối giá trị không phải URL hay data URI', async () => {
      const dto: CreateKycDto = { userId: USER_ID, frontImage: 'not-a-url-or-data-uri' };
      await expect(service.create(dto)).rejects.toThrow(
        'frontImage must be a valid HTTP(S) URL or a data URI',
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('chấp nhận null/undefined cho các trường ảnh (không validate)', async () => {
      const saved = makeKyc({ id: 'null-1' });
      repo.save.mockResolvedValue(saved);
      await expect(service.validateImage(null, 'frontImage')).toBeUndefined();
      await expect(service.validateImage(undefined, 'frontImage')).toBeUndefined();
      await expect(service.validateImage('', 'frontImage')).toBeUndefined();

      const result = await service.create({ userId: USER_ID, frontImage: null as any });
      expect(result).toBe(saved);
    });
  });

  // =========================================================================
  // findOne / findByUser
  // =========================================================================
  describe('findOne', () => {
    it('trả về entity khi tìm thấy', async () => {
      const kyc = makeKyc({ id: 'found-me' });
      repo.findOne.mockResolvedValue(kyc);

      const result = await service.findOne('found-me');
      expect(result).toBe(kyc);
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'found-me' } });
    });

    it('ném NotFoundException khi không tồn tại', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('missing')).rejects.toThrow(/KYC submission missing not found/);
    });
  });

  describe('findByUser', () => {
    it('trả về KYC của user nếu tồn tại', async () => {
      const kyc = makeKyc({ userId: USER_ID });
      repo.findOne.mockResolvedValue(kyc);

      const result = await service.findByUser(USER_ID);
      expect(result).toBe(kyc);
      expect(repo.findOne).toHaveBeenCalledWith({ where: { userId: USER_ID } });
    });

    it('trả về null nếu user chưa có KYC', async () => {
      repo.findOne.mockResolvedValue(null);
      const result = await service.findByUser('no-kyc-user');
      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // updateStatus — chuyển trạng thái + notification job
  // =========================================================================
  describe('updateStatus', () => {
    it('PENDING -> APPROVED, ghi rejectReason = null, enqueue kyc.approval', async () => {
      const kyc = makeKyc({ status: KYCStatus.PENDING });
      repo.findOne.mockResolvedValue(kyc);
      repo.save.mockImplementation(async (e: KycEntity) => e);

      const dto: KycStatusUpdateDto = { status: KYCStatus.APPROVED };
      const result = await service.updateStatus(kyc.id, dto, REVIEWER_ID);

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: KYCStatus.APPROVED,
          rejectReason: null,
          reviewedBy: REVIEWER_ID,
        }),
      );
      expect(result.status).toBe(KYCStatus.APPROVED);
      expect(queue.add).toHaveBeenCalledWith('kyc.approval', expect.objectContaining({
        kycId: kyc.id,
        userId: kyc.userId,
        status: KYCStatus.APPROVED,
        rejectReason: null,
      }));
    });

    it('PENDING -> REJECTED, lưu rejectReason và enqueue kyc.approval', async () => {
      const kyc = makeKyc({ status: KYCStatus.PENDING });
      repo.findOne.mockResolvedValue(kyc);
      repo.save.mockImplementation(async (e: KycEntity) => e);

      const dto: KycStatusUpdateDto = { status: KYCStatus.REJECTED, rejectReason: 'Sai họ tên' };
      const result = await service.updateStatus(kyc.id, dto, REVIEWER_ID);

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: KYCStatus.REJECTED,
          rejectReason: 'Sai họ tên',
          reviewedBy: REVIEWER_ID,
        }),
      );
      expect(result.status).toBe(KYCStatus.REJECTED);
      expect(queue.add).toHaveBeenCalledWith('kyc.approval', expect.objectContaining({
        kycId: kyc.id,
        userId: kyc.userId,
        status: KYCStatus.REJECTED,
        rejectReason: 'Sai họ tên',
      }));
    });

    it('UNDER_REVIEW -> APPROVED vẫn cho phép', async () => {
      const kyc = makeKyc({ status: KYCStatus.UNDER_REVIEW });
      repo.findOne.mockResolvedValue(kyc);
      repo.save.mockImplementation(async (e: KycEntity) => e);

      const result = await service.updateStatus(kyc.id, { status: KYCStatus.APPROVED }, REVIEWER_ID);
      expect(result.status).toBe(KYCStatus.APPROVED);
      expect(queue.add).toHaveBeenCalled();
    });

    it('từ chối cập nhật khi status không phải PENDING/UNDER_REVIEW', async () => {
      const kyc = makeKyc({ status: KYCStatus.APPROVED });
      repo.findOne.mockResolvedValue(kyc);

      await expect(
        service.updateStatus(kyc.id, { status: KYCStatus.REJECTED }, REVIEWER_ID),
      ).rejects.toThrow('Cannot update KYC from status approved');
      expect(repo.save).not.toHaveBeenCalled();
      expect(queue.add).not.toHaveBeenCalled();
    });

    it('từ chối 404 khi KYC không tồn tại', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(
        service.updateStatus('ghost', { status: KYCStatus.APPROVED }, REVIEWER_ID),
      ).rejects.toThrow(NotFoundException);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // list — filter + sort
  // =========================================================================
  describe('list', () => {
    it('mặc định trả về mảng rỗng khi không có kết quả', async () => {
      repo.find.mockResolvedValue([]);
      const result = await service.list({} as KycQueryDto);
      expect(result).toEqual([]);
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          order: { submittedAt: 'DESC' },
          relations: { user: true },
        }),
      );
    });

    it('lọc theo status', async () => {
      repo.find.mockResolvedValue([]);
      await service.list({ status: KYCStatus.PENDING } as KycQueryDto);
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: KYCStatus.PENDING },
        }),
      );
    });

    it('lọc theo khoảng submittedAt', async () => {
      repo.find.mockResolvedValue([]);
      await service.list({
        submittedAfter: '2026-09-01',
        submittedBefore: '2026-09-30',
      } as KycQueryDto);
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            submittedAt: expect.anything(),
          },
        }),
      );
    });

    it('sắp xếp DESC theo submittedAt và kèm relation user', async () => {
      repo.find.mockResolvedValue([]);
      await service.list({} as KycQueryDto);
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { submittedAt: 'DESC' },
          relations: { user: true },
        }),
      );
    });
  });

  // =========================================================================
  // pendingCount — endpoint cho admin dashboard
  // =========================================================================
  describe('pendingCount', () => {
    it('trả về { pending, underReview } từ 2 count song song', async () => {
      repo.count.mockResolvedValue(1);
      const result = await service.pendingCount();

      expect(repo.count).toHaveBeenNthCalledWith(1, {
        where: { status: KYCStatus.PENDING },
      });
      expect(repo.count).toHaveBeenNthCalledWith(2, {
        where: { status: KYCStatus.UNDER_REVIEW },
      });
      expect(result).toEqual({ pending: 1, underReview: 1 });
    });

    it('trả về 0 khi không có record nào', async () => {
      repo.count.mockResolvedValue(0);
      const result = await service.pendingCount();
      expect(result).toEqual({ pending: 0, underReview: 0 });
    });
  });
});
