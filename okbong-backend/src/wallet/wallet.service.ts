import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { roundAmount } from '../common/utils/amount.util';
import { WalletType } from './dto/wallet.dto';
import { WalletEntity, WalletStatus } from './entity/wallet.entity';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(WalletEntity)
    private readonly walletRepository: Repository<WalletEntity>,
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

  deposit(userId: string, amount: number, type: WalletType): Promise<WalletEntity> {
    return this.applyDelta(userId, amount, type, 'deposit');
  }

  withdraw(userId: string, amount: number, type: WalletType): Promise<WalletEntity> {
    return this.applyDelta(userId, -amount, type, 'withdraw');
  }

  /**
   * Applies a signed balance change inside a transaction so concurrent
   * deposits/withdrawals cannot corrupt the stored balance.
   */
  private async applyDelta(
    userId: string,
    delta: number,
    type: WalletType,
    operation: 'deposit' | 'withdraw',
  ): Promise<WalletEntity> {
    if (!Number.isFinite(delta) || delta === 0) {
      throw new BadRequestException('Amount must be a non zero number');
    }

    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(WalletEntity);
      let wallet = await repository.findOne({ where: { userId, type } });

      if (!wallet) {
        if (operation === 'withdraw') throw new BadRequestException('Insufficient balance');

        wallet = repository.create({ userId, type, balance: 0, status: WalletStatus.ACTIVE });
      }

      const nextBalance = roundAmount(Number(wallet.balance) + delta);
      if (nextBalance < 0) throw new BadRequestException('Insufficient balance');

      wallet.balance = nextBalance;
      return repository.save(wallet);
    });
  }
}
