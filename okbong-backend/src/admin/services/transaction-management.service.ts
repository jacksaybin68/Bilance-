import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { roundAmount } from '../../common/utils/amount.util';
import { UserEntity } from '../../user/entity/user.entity';
import { WalletEntity } from '../../wallet/entity/wallet.entity';
import {
  TransactionEntity,
  TransactionStatus,
  TransactionType,
} from '../../wallet/entity/transaction.entity';
import { ActivityAction } from '../entities/activity-log.entity';
import { ActivityLogService } from './activity-log.service';
import { AdminTransactionQueryDto, WalletAdjustmentDto } from '../dto/transaction-management.dto';

export interface AdminTransactionView extends TransactionEntity {
  userEmail?: string | null;
  walletType?: string | null;
  currency?: string | null;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TransactionStats {
  total: number;
  pending: number;
  completed: number;
  failed: number;
  reversed: number;
  totalDeposit: number;
  totalWithdraw: number;
  netFlow: number;
}

interface TransactionRowRaw {
  userEmail?: string | null;
  walletType?: string | null;
  currency?: string | null;
}

@Injectable()
export class TransactionManagementService {
  private readonly logger = new Logger(TransactionManagementService.name);

  constructor(
    @InjectRepository(TransactionEntity)
    private readonly transactionRepository: Repository<TransactionEntity>,
    private readonly dataSource: DataSource,
    private readonly activityLogService: ActivityLogService,
  ) {}

  // ── Listing ──────────────────────────────────────────────────────
  async list(query: AdminTransactionQueryDto): Promise<PaginatedResult<AdminTransactionView>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.transactionRepository
      .createQueryBuilder('tx')
      .leftJoin(WalletEntity, 'wallet', 'wallet.id = tx.walletId')
      .leftJoin(UserEntity, 'owner', 'owner.id = tx.userId')
      .addSelect('owner.email', 'userEmail')
      .addSelect('wallet.type', 'walletType')
      .addSelect('wallet.currency', 'currency');

    if (query.userId) qb.andWhere('tx.userId = :userId', { userId: query.userId });
    if (query.walletId) qb.andWhere('tx.walletId = :walletId', { walletId: query.walletId });
    if (query.type) qb.andWhere('tx.type = :type', { type: query.type });
    if (query.status) qb.andWhere('tx.status = :status', { status: query.status });
    if (query.walletType) qb.andWhere('wallet.type = :walletType', { walletType: query.walletType });
    if (query.minAmount !== undefined) {
      qb.andWhere('tx.amount >= :minAmount', { minAmount: query.minAmount });
    }
    if (query.maxAmount !== undefined) {
      qb.andWhere('tx.amount <= :maxAmount', { maxAmount: query.maxAmount });
    }
    if (query.from) qb.andWhere('tx.createdAt >= :from', { from: new Date(query.from) });
    if (query.to) qb.andWhere('tx.createdAt <= :to', { to: new Date(query.to) });
    if (query.search) {
      qb.andWhere(
        '(tx.reference LIKE :search OR tx.description LIKE :search OR owner.email LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const total = await qb.getCount();

    const { entities, raw } = await qb
      .orderBy('tx.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getRawAndEntities<TransactionRowRaw>();

    const items: AdminTransactionView[] = entities.map((entity, index) => ({
      ...entity,
      userEmail: raw[index]?.userEmail ?? null,
      walletType: raw[index]?.walletType ?? null,
      currency: raw[index]?.currency ?? null,
    }));

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<AdminTransactionView> {
    const transaction = await this.transactionRepository.findOne({
      where: { id },
      relations: { wallet: true },
    });
    if (!transaction) throw new NotFoundException(`Transaction ${id} was not found`);

    const user = transaction.userId
      ? await this.dataSource.getRepository(UserEntity).findOne({ where: { id: transaction.userId } })
      : null;

    return {
      ...transaction,
      userEmail: user?.email ?? null,
      walletType: transaction.wallet?.type ?? null,
      currency: transaction.wallet?.currency ?? null,
    };
  }

  async stats(): Promise<TransactionStats> {
    const [total, pending, completed, failed, reversed] = await Promise.all([
      this.transactionRepository.count(),
      this.transactionRepository.count({ where: { status: TransactionStatus.PENDING } }),
      this.transactionRepository.count({ where: { status: TransactionStatus.COMPLETED } }),
      this.transactionRepository.count({ where: { status: TransactionStatus.FAILED } }),
      this.transactionRepository.count({ where: { status: TransactionStatus.REVERSED } }),
    ]);

    const settled = await this.transactionRepository.find({
      where: { status: TransactionStatus.COMPLETED },
      select: { amount: true, type: true },
    });

    const totalDeposit = roundAmount(
      settled.filter((tx) => this.isCredit(tx.type)).reduce((sum, tx) => sum + Number(tx.amount), 0),
    );
    const totalWithdraw = roundAmount(
      settled.filter((tx) => !this.isCredit(tx.type)).reduce((sum, tx) => sum + Number(tx.amount), 0),
    );

    return {
      total,
      pending,
      completed,
      failed,
      reversed,
      totalDeposit,
      totalWithdraw,
      netFlow: roundAmount(totalDeposit - totalWithdraw),
    };
  }

  // ── Review actions ───────────────────────────────────────────────
  /**
   * Approves a pending deposit/withdraw. `WalletService.applyDelta` settles
   * immediately, so a pending row is money that has not landed yet; the balance
   * is only moved once an admin approves it here.
   */
  async approve(id: string, adminId: string, note?: string): Promise<AdminTransactionView> {
    return this.settle(
      id,
      TransactionStatus.COMPLETED,
      adminId,
      'Duyệt giao dịch',
      note,
      ActivityAction.WALLET_TOPUP,
    );
  }

  async reject(id: string, adminId: string, reason?: string): Promise<AdminTransactionView> {
    return this.settle(
      id,
      TransactionStatus.FAILED,
      adminId,
      'Từ chối giao dịch',
      reason,
      ActivityAction.UNKNOWN,
    );
  }

  private async settle(
    id: string,
    target: TransactionStatus,
    adminId: string,
    actionLabel: string,
    note: string | undefined,
    action: ActivityAction,
  ): Promise<AdminTransactionView> {
    const { saved, wallet } = await this.dataSource.transaction(async (manager) => {
      const txRepo = manager.getRepository(TransactionEntity);
      const walletRepo = manager.getRepository(WalletEntity);

      const transaction = await txRepo.findOne({ where: { id } });
      if (!transaction) throw new NotFoundException(`Transaction ${id} was not found`);

      if (transaction.status !== TransactionStatus.PENDING) {
        throw new BadRequestException(
          `Only pending transactions can be reviewed (current status: ${transaction.status})`,
        );
      }

      const walletRow = await walletRepo.findOne({ where: { id: transaction.walletId } });
      if (!walletRow) throw new NotFoundException(`Wallet ${transaction.walletId} was not found`);

      transaction.balanceBefore = Number(walletRow.balance);

      if (target === TransactionStatus.COMPLETED) {
        const delta = this.isCredit(transaction.type)
          ? Number(transaction.amount)
          : -Number(transaction.amount);
        const nextBalance = roundAmount(Number(walletRow.balance) + delta);
        if (nextBalance < 0) {
          throw new BadRequestException('Approving this transaction would overdraw the wallet');
        }
        walletRow.balance = nextBalance;
        transaction.balanceAfter = nextBalance;
        await walletRepo.save(walletRow);
      } else {
        transaction.balanceAfter = Number(walletRow.balance);
      }

      transaction.status = target;
      if (note) transaction.reference = note;

      return { saved: await txRepo.save(transaction), wallet: walletRow };
    });

    await this.recordAdminAction(
      adminId,
      action,
      `${actionLabel} ${id}${note ? ` — ${note}` : ''}`,
      { transactionId: id, status: target },
    );

    this.logger.log(`admin ${adminId} set transaction ${id} to ${target}`);

    return { ...saved, walletType: wallet.type, currency: wallet.currency };
  }

  /**
   * Reverses a completed transaction: the wallet is debited (deposit) or
   * credited (withdraw) by the original amount and the row is marked reversed.
   */
  async reverse(id: string, adminId: string, reason?: string): Promise<AdminTransactionView> {
    const { saved, wallet } = await this.dataSource.transaction(async (manager) => {
      const txRepo = manager.getRepository(TransactionEntity);
      const walletRepo = manager.getRepository(WalletEntity);

      const transaction = await txRepo.findOne({ where: { id } });
      if (!transaction) throw new NotFoundException(`Transaction ${id} was not found`);

      if (transaction.status !== TransactionStatus.COMPLETED) {
        throw new BadRequestException(
          `Only completed transactions can be reversed (current status: ${transaction.status})`,
        );
      }

      const walletRow = await walletRepo.findOne({ where: { id: transaction.walletId } });
      if (!walletRow) throw new NotFoundException(`Wallet ${transaction.walletId} was not found`);

      const delta = this.isCredit(transaction.type)
        ? -Number(transaction.amount)
        : Number(transaction.amount);
      const nextBalance = roundAmount(Number(walletRow.balance) + delta);
      if (nextBalance < 0) {
        throw new BadRequestException(
          'The wallet no longer holds enough balance to reverse this transaction',
        );
      }

      transaction.balanceBefore = Number(walletRow.balance);
      transaction.balanceAfter = nextBalance;
      walletRow.balance = nextBalance;
      await walletRepo.save(walletRow);

      transaction.status = TransactionStatus.REVERSED;
      if (reason) transaction.reference = reason;

      return { saved: await txRepo.save(transaction), wallet: walletRow };
    });

    await this.recordAdminAction(
      adminId,
      ActivityAction.UNKNOWN,
      `Hoàn tác giao dịch ${id}${reason ? ` — ${reason}` : ''}`,
      { transactionId: id },
    );

    return { ...saved, walletType: wallet.type, currency: wallet.currency };
  }

  /**
   * Manual balance correction. Always writes a paired `adjustment` ledger row so
   * the wallet balance and the transaction history never drift apart.
   */
  async adjustWallet(
    dto: WalletAdjustmentDto,
    adminId: string,
  ): Promise<{ wallet: WalletEntity; transaction: TransactionEntity }> {
    if (!Number.isFinite(dto.amount) || roundAmount(dto.amount) === 0) {
      throw new BadRequestException('Adjustment amount must be a non-zero number');
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const walletRepo = manager.getRepository(WalletEntity);
      const txRepo = manager.getRepository(TransactionEntity);

      const wallet = await walletRepo.findOne({ where: { id: dto.walletId } });
      if (!wallet) throw new NotFoundException(`Wallet ${dto.walletId} was not found`);

      const delta = roundAmount(dto.amount);
      const before = Number(wallet.balance);
      const after = roundAmount(before + delta);
      if (after < 0) throw new BadRequestException('Adjustment would overdraw the wallet');

      wallet.balance = after;
      const savedWallet = await walletRepo.save(wallet);

      const transaction = txRepo.create({
        walletId: wallet.id,
        userId: wallet.userId,
        type: TransactionType.ADJUSTMENT,
        status: TransactionStatus.COMPLETED,
        amount: Math.abs(delta),
        balanceBefore: before,
        balanceAfter: after,
        reference: dto.reason,
        description: `Điều chỉnh thủ công bởi quản trị viên (${delta > 0 ? '+' : ''}${delta})`,
      });
      const savedTransaction = await txRepo.save(transaction);

      return { wallet: savedWallet, transaction: savedTransaction };
    });

    await this.recordAdminAction(
      adminId,
      ActivityAction.WALLET_TRANSFER,
      `Điều chỉnh ví ${dto.walletId} ${dto.amount > 0 ? '+' : ''}${dto.amount} — ${dto.reason}`,
      { walletId: dto.walletId, amount: dto.amount, reason: dto.reason },
    );

    return result;
  }

  async pendingCount(): Promise<number> {
    return this.transactionRepository.count({ where: { status: TransactionStatus.PENDING } });
  }

  private isCredit(type: TransactionType): boolean {
    return type === TransactionType.DEPOSIT || type === TransactionType.TRANSFER_IN;
  }

  private async recordAdminAction(
    adminId: string,
    action: ActivityAction,
    description: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    // Audit logging must never fail the money movement it describes.
    try {
      await this.activityLogService.record({ userId: adminId, action, description, metadata });
    } catch (error) {
      this.logger.warn(
        `failed to write activity log for admin ${adminId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
