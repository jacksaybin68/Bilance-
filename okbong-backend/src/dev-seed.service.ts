import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './enumeration/role.enum';
import { UserEntity, UserStatus } from './user/entity/user.entity';
import { WalletEntity, WalletStatus } from './wallet/entity/wallet.entity';
import { WalletType } from './wallet/dto/wallet.dto';

interface DemoAccount {
  email: string;
  password: string;
  fullName: string;
  role: Role;
  balance: number;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: 'user.demo@okbong.com',
    password: 'demo123456',
    fullName: 'Demo User',
    role: Role.USER,
    balance: 50000,
  },
  {
    email: 'admin.demo@okbong.com',
    password: 'demo123456',
    fullName: 'Demo Admin',
    role: Role.ADMIN,
    balance: 0,
  },
];

/**
 * Recreates the demo logins used by the frontends when the development
 * database has none. Only runs outside production so a real deployment never
 * gains known-credential accounts.
 */
@Injectable()
export class DevSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DevSeedService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(WalletEntity)
    private readonly walletRepository: Repository<WalletEntity>,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.configService.get<string>('NODE_ENV') === 'production') return;

    for (const account of DEMO_ACCOUNTS) {
      const email = account.email.toLowerCase();

      // `passwordHash` is plain text here on purpose: UserEntity's @BeforeInsert
      // hook hashes any value that is not already a `scrypt$...` digest.
      let user = await this.userRepository.findOne({ where: { email } });
      if (!user) {
        user = await this.userRepository.save(
          this.userRepository.create({
            email,
            fullName: account.fullName,
            passwordHash: account.password,
            role: account.role,
            status: UserStatus.ACTIVE,
          }),
        );
        this.logger.log(`Seeded demo account ${email}`);
      }

      const wallet = await this.walletRepository.findOne({
        where: { userId: user.id, type: WalletType.E_WALLET },
      });
      if (!wallet) {
        await this.walletRepository.save(
          this.walletRepository.create({
            userId: user.id,
            type: WalletType.E_WALLET,
            balance: account.balance,
            currency: 'BDSD',
            status: WalletStatus.ACTIVE,
          }),
        );
      }
    }
  }
}
