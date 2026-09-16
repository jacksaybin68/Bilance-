import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity, UserStatus } from '../user/entity/user.entity';
import { WalletEntity, WalletStatus } from '../wallet/entity/wallet.entity';
import { BillEntity } from '../bill/entity/bill.entity';
import { BillStatus } from '../bill/dto/bill.dto';
import { Role } from '../enumeration/role.enum';
import { ActivityLogEntity } from './entities/activity-log.entity';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(WalletEntity)
    private readonly walletRepository: Repository<WalletEntity>,
    @InjectRepository(BillEntity)
    private readonly billRepository: Repository<BillEntity>,
    @InjectRepository(ActivityLogEntity)
    private readonly activityLogRepository: Repository<ActivityLogEntity>,
  ) {}

  // ── User management ──────────────────────────────────────────────
  async userCount(): Promise<{ total: number; active: number; banned: number }> {
    const total = await this.userRepository.count();
    const active = await this.userRepository.count({ where: { status: UserStatus.ACTIVE } });
    const banned = await this.userRepository.count({ where: { status: UserStatus.BANNED } });
    return { total, active, banned };
  }

  async banUser(userId: string): Promise<void> {
    await this.userRepository.update(userId, { status: UserStatus.BANNED });
  }

  async unbanUser(userId: string): Promise<void> {
    await this.userRepository.update(userId, { status: UserStatus.ACTIVE });
  }

  async changeUserRole(userId: string, role: Role): Promise<void> {
    await this.userRepository.update(userId, { role });
  }

  // ── Wallet management ────────────────────────────────────────────
  async walletCount(): Promise<{ total: number; active: number }> {
    const total = await this.walletRepository.count();
    const active = await this.walletRepository.count({ where: { status: WalletStatus.ACTIVE } });
    return { total, active };
  }

  // ── Bill management ──────────────────────────────────────────────
  async billCount(): Promise<{ pending: number; paid: number; total: number }> {
    const total = await this.billRepository.count();
    const pending = await this.billRepository.count({ where: { status: BillStatus.PENDING } });
    const paid = await this.billRepository.count({ where: { status: BillStatus.PAID } });
    return { pending, paid, total };
  }

  // ── Activity log ─────────────────────────────────────────────────
  async recentActivity(limit = 50) {
    return this.activityLogRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
