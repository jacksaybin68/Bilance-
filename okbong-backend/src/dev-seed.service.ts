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
    email: 'user@gmail.com',
    password: 'Deohieusao123@',
    fullName: 'Demo User',
    role: Role.USER,
    balance: 50000,
  },
  {
    email: 'admin@gmail.com',
    password: 'Deohieusao123@',
    fullName: 'Demo Admin',
    role: Role.ADMIN,
    balance: 0,
  },
];

/** Logins from earlier revisions that must not survive a credential change. */
const RETIRED_ACCOUNT_EMAILS = ['user.demo@okbong.com', 'admin.demo@okbong.com'];

/**
 * Recreates the demo logins used by the frontends when the development
 * database has none. Accounts whose email already exists are refreshed rather
 * than skipped, so changing DEMO_ACCOUNTS actually rotates the password
 * instead of leaving the previous credentials working. Retired demo logins are
 * removed. Only runs outside production so a real deployment never gains
 * known-credential accounts.
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

    for (const email of RETIRED_ACCOUNT_EMAILS) {
      const removed = await this.userRepository.delete({ email });
      if (removed.affected) this.logger.log(`Removed retired demo account ${email}`);
    }

    for (const account of DEMO_ACCOUNTS) {
      const email = account.email.toLowerCase();

      // `passwordHash` is plain text here on purpose: UserEntity's @BeforeUpdate
      // hook re-hashes any value that is not already a `scrypt$...` digest, so
      // assigning the plain password rotates the stored digest on every boot.
      const existing = await this.userRepository.findOne({ where: { email } });
      const user = existing
        ? await this.userRepository.save(
            this.userRepository.merge(existing, {
              fullName: account.fullName,
              passwordHash: account.password,
              role: account.role,
              status: UserStatus.ACTIVE,
            }),
          )
        : await this.userRepository.save(
            this.userRepository.create({
              email,
              fullName: account.fullName,
              passwordHash: account.password,
              role: account.role,
              status: UserStatus.ACTIVE,
            }),
          );

      if (!existing) this.logger.log(`Seeded demo account ${email}`);

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
