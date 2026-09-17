import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import { roundAmount } from '../common/utils/amount.util';
import { WalletType } from './dto/wallet.dto';
import { WalletEntity, WalletStatus } from './entity/wallet.entity';
import {
  TransactionEntity,
  TransactionType,
  TransactionStatus,
} from './entity/transaction.entity';
import { TransactionQueryDto } from './dto/transaction.dto';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(WalletEntity)
    private readonly walletRepository: Repository<WalletEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactionRepository: Repository<TransactionEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async findByUser(userId: string, type?: WalletType): Promise<WalletEntity[]> {
    return this.walletRepository.find({
      where: type ? { userId, type } : { userId },
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<WalletEntity> {
    const wallet = await this.walletRepository.findOneBy({ id });
    if (!wallet) throw new NotFoundException(`Wallet ${id} was not found`);
    return wallet;
  }

  async transactionHistory(
    walletId: string,
    query: TransactionQueryDto,
    limit = 50,
    offset = 0,
  ) {
    const where: FindOptionsWhere<TransactionEntity> = { walletId };
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.reference) where.reference = query.reference;

    const [items, total] = await this.transactionRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { items, total };
  }

  deposit(userId: string, amount: number, type: WalletType): Promise<WalletEntity> {
    return this.applyDelta(userId, amount, type, 'deposit');
  }

  withdraw(userId: string, amount: number, type: WalletType): Promise<WalletEntity> {
    return this.applyDelta(userId, -amount, type, 'withdraw');
  }

  /**
   * Adjusts a wallet balance by an arbitrary (signed) delta and records an
   * `adjustment` transaction. Used for order settlement or admin corrections.
   */
  adjust(
    userId: string,
    delta: number,
    type: WalletType = WalletType.E_WALLET,
    description?: string,
    reference?: string,
  ): Promise<WalletEntity> {
    return this.applyDelta(userId, delta, type, 'adjust', description, reference);
  }

  private async applyDelta(
    userId: string,
    delta: number,
    type: WalletType,
    operation: 'deposit' | 'withdraw' | 'adjust',
    description?: string,
    reference?: string,
  ): Promise<WalletEntity> {
    if (!Number.isFinite(delta) || delta === 0) {
      throw new BadRequestException('Amount must be a non zero number');
    }

    return this.dataSource.transaction(async (manager) => {
      const walletRepo = manager.getRepository(WalletEntity);
      const txRepo = manager.getRepository(TransactionEntity);

      let wallet = await walletRepo.findOne({ where: { userId, type } });

      if (!wallet) {
        if (operation === 'withdraw') throw new BadRequestException('Insufficient balance');
        wallet = walletRepo.create({ userId, type, balance: 0, status: WalletStatus.ACTIVE });
      }

      const balanceBefore = Number(wallet.balance);
      const nextBalance = roundAmount(balanceBefore + delta);
      if (nextBalance < 0) throw new BadRequestException('Insufficient balance');

      const txType =
        operation === 'deposit'
          ? TransactionType.DEPOSIT
          : operation === 'withdraw'
            ? TransactionType.WITHDRAW
            : TransactionType.ADJUSTMENT;
      const txStatus = TransactionStatus.COMPLETED;

      const fallback = `Điều chỉnh số dư ví${delta >= 0 ? '' : ' (trừ điểm)'}`;

      // Save the wallet first so its id is populated (needed for a brand-new wallet),
      // then record the transaction against the persisted id.
      wallet.balance = nextBalance;
      const savedWallet = await walletRepo.save(wallet);

      const transaction = txRepo.create({
        walletId: savedWallet.id,
        userId,
        type: txType,
        status: txStatus,
        amount: Math.abs(delta),
        balanceBefore,
        balanceAfter: nextBalance,
        description: description ?? fallback,
        reference: reference ?? null,
      });
      await txRepo.save(transaction);

      return savedWallet;
    });
  }
}
