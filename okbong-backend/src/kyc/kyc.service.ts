import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { KycEntity, KYCStatus } from './entities/kyc.entity';
import { CreateKycDto, KycStatusUpdateDto, KycQueryDto } from './dto/kyc.dto';
import { UserModule } from '../user/user.module';
import { forwardRef, Inject } from '@nestjs/common';
import { UserService } from '../user/user.service';

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(
    @InjectRepository(KycEntity)
    private readonly kycRepository: Repository<KycEntity>,
    @Inject(forwardRef(() => UserModule))
    private readonly userModuleRef: UserModule,
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

    const saved = await this.kycRepository.save(kyc);
    this.logger.log(`KYC submitted: ${saved.id} for user ${dto.userId}`);
    return saved;
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
    return this.kycRepository.save(kyc);
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
