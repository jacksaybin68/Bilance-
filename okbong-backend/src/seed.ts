import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { DataSource } from 'typeorm';
import { UserEntity, UserStatus } from './user/entity/user.entity';
import { WalletEntity, WalletStatus } from './wallet/entity/wallet.entity';
import { BillEntity } from './bill/entity/bill.entity';
import { BillStatus, BillType } from './bill/dto/bill.dto';
import { Role } from './enumeration/role.enum';

const opts = {
  type: 'better-sqlite3',
  database: join(tmpdir(), 'okbong-seed.db'),
  synchronize: true,
  entities: ['./src/**/*.entity.ts'],
  logging: false,
};

async function seed() {
  const dataSource = new DataSource(opts as never);
  await dataSource.initialize();

  const userRepo = dataSource.getRepository(UserEntity);
  const walletRepo = dataSource.getRepository(WalletEntity);
  const billRepo = dataSource.getRepository(BillEntity);

  // Ensure fresh state
  await userRepo.clear();
  await walletRepo.clear();
  await billRepo.clear();

  const bob = userRepo.create({
    email: 'bob@okbong.local',
    fullName: 'Bob Nguyễn',
    passwordHash: 'scrypt$xx$yy',
    role: Role.USER,
    status: UserStatus.ACTIVE,
  });
  const alice = userRepo.create({
    email: 'alice@okbong.local',
    fullName: 'Alice Trần',
    passwordHash: 'scrypt$xx$yy',
    role: Role.USER,
    status: UserStatus.ACTIVE,
  });
  const admin = userRepo.create({
    email: 'admin@okbong.local',
    fullName: 'Admin OKBong',
    passwordHash: 'scrypt$xx$yy',
    role: Role.ADMIN,
    status: UserStatus.ACTIVE,
  });

  const [savedBob, savedAlice, savedAdmin] = await userRepo.save([bob, alice, admin]);

  const bobWallet = walletRepo.create({
    userId: savedBob.id,
    type: 'e_wallet',
    balance: 1200000,
    currency: 'BDSD',
    status: WalletStatus.ACTIVE,
  });
  const aliceWallet = walletRepo.create({
    userId: savedAlice.id,
    type: 'e_wallet',
    balance: 850000,
    currency: 'BDSD',
    status: WalletStatus.ACTIVE,
  });

  const [bobW, aliceW] = await walletRepo.save([bobWallet, aliceWallet]);

  const bills = await billRepo.save([
    billRepo.create({
      userId: savedBob.id,
      amount: 150000,
      type: BillType.RECURRING,
      status: BillStatus.PENDING,
      description: 'Internet September',
    }),
    billRepo.create({
      userId: savedAlice.id,
      amount: 250000,
      type: BillType.RECURRING,
      status: BillStatus.PAID,
      description: 'Electricity August',
    }),
    billRepo.create({
      userId: savedBob.id,
      amount: 50000,
      type: BillType.ONE_OFF,
      status: BillStatus.PENDING,
      description: 'Parking fee',
    }),
  ]);

  console.log('Seed complete');
  console.log(`  users: ${savedBob.email}, ${savedAlice.email}, ${savedAdmin.email}`);
  console.log(`  wallets: bob=${bobW.balance}, alice=${aliceW.balance}`);
  console.log(`  bills: ${bills.length} created`);

  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
