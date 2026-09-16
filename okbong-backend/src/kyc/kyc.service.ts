import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { KycEntity, KYCStatus } from './entities/kyc.entity';
import { CreateKycDto, KycStatusUpdateDto, KycQueryDto } from './dto/kyc.dto';
import { QueueService } from '../queue/queue.service';

const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BASE64_SIZE_BYTES = 5 * 1024 * 1024;

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(
    @InjectRepository(KycEntity)
    private readonly kycRepository: Repository<KycEntity>,
    private readonly queueService: QueueService,
  ) {}

  async create(dto: CreateKycDto): Promise<KycEntity> {
    const existing = await this.kycRepository.findOne({
      where: { userId: dto.userId, status: KYCStatus.PENDING },
    });
    if (existing) {
      throw new BadRequestException('A pending KYC submission already exists for this user');
    }

    const kyc = this.kycRepository.create({
      userId: dto.userId,
      frontImage: dto.frontImage ?? null,
      backImage: dto.backImage ?? null,
      selfieImage: dto.selfieImage ?? null,
      idNumber: dto.idNumber ?? null,
      documentName: dto.documentName ?? null,
      status: KYCStatus.PENDING,
    });

    this.validateImage(dto.frontImage, 'frontImage');
    this.validateImage(dto.backImage, 'backImage');
    this.validateImage(dto.selfieImage, 'selfieImage');

    const saved = await this.kycRepository.save(kyc);
    this.logger.log(`KYC submitted: ${saved.id} for user ${dto.userId}`);
    return saved;
  }

  validateImage(image: string | null | undefined, fieldName: string): void {
    if (!image) return;

    const trimmed = image.trim();
    if (trimmed.startsWith('data:')) {
      const headerEnd = trimmed.indexOf(',');
      if (headerEnd === -1) {
        throw new BadRequestException(`${fieldName} is not a valid data URI`);
      }
      const header = trimmed.slice(0, headerEnd);
      const mimeMatch = header.match(/^data:([^;]+)/);
      if (!mimeMatch) {
        throw new BadRequestException(`${fieldName} is not a valid data URI`);
      }
      const mime = mimeMatch[1].toLowerCase();
      if (!ALLOWED_IMAGE_MIME.includes(mime)) {
        throw new BadRequestException(`${fieldName} must be one of: ${ALLOWED_IMAGE_MIME.join(', ')}`);
      }

      const encoded = trimmed.slice(headerEnd + 1);
      const base64 = encoded.replace(/\s+/g, '');
      const decodedBytes = Math.ceil((base64.length * 3) / 4);
      if (decodedBytes > MAX_BASE64_SIZE_BYTES) {
        throw new BadRequestException(`${fieldName} exceeds the maximum image size of ${MAX_BASE64_SIZE_BYTES / 1024 / 1024} MB`);
      }
      return;
    }

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return;
    }

    throw new BadRequestException(`${fieldName} must be a valid HTTP(S) URL or a data URI`);
  }

  private enqueueApprovalNotification(kyc: KycEntity): void {
    this.queueService
      .add('kyc.approval', {
        kycId: kyc.id,
        userId: kyc.userId,
        status: kyc.status,
        rejectReason: kyc.rejectReason ?? null,
      })
      .catch((err) =>
        this.logger.error(` failed to enqueue kyc.approval for ${kyc.id}: ${err}`),
      );
  }

  async findOne(id: string): Promise<KycEntity> {
    const kyc = await this.kycRepository.findOne({ where: { id } });
    if (!kyc) throw new NotFoundException(`KYC submission ${id} not found`);
    return kyc;
  }

  async findByUser(userId: string): Promise<KycEntity | null> {
    return this.kycRepository.findOne({ where: { userId } });
  }

  async updateStatus(id: string, dto: KycStatusUpdateDto, reviewerId: string): Promise<KycEntity> {
    const kyc = await this.findOne(id);

    if (kyc.status !== KYCStatus.PENDING && kyc.status !== KYCStatus.UNDER_REVIEW) {
      throw new BadRequestException(`Cannot update KYC from status ${kyc.status}`);
    }

    kyc.status = dto.status;
    kyc.rejectReason = dto.rejectReason ?? null;
    kyc.reviewedBy = reviewerId;
    const updated = await this.kycRepository.save(kyc);

    if (kyc.status === KYCStatus.APPROVED || kyc.status === KYCStatus.REJECTED) {
      this.enqueueApprovalNotification(updated);
    }

    return updated;
  }

  async pendingCount(): Promise<{ pending: number; underReview: number }> {
    const [pending, underReview] = await Promise.all([
      this.kycRepository.count({ where: { status: KYCStatus.PENDING } }),
      this.kycRepository.count({ where: { status: KYCStatus.UNDER_REVIEW } }),
    ]);
    return { pending, underReview };
  }

  async list(query: KycQueryDto): Promise<KycEntity[]> {
    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.submittedAfter || query.submittedBefore) {
      where.submittedAt = Between(
        query.submittedAfter ? new Date(query.submittedAfter) : new Date(0),
        query.submittedBefore ? new Date(query.submittedBefore) : new Date(),
      );
    }
    return this.kycRepository.find({
      where,
      order: { submittedAt: 'DESC' },
      relations: { user: true },
    });
  }
}
