import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { DataSource } from 'typeorm';
import { UserEntity, UserStatus } from './user/entity/user.entity';
import { WalletEntity, WalletStatus } from './wallet/entity/wallet.entity';
import { BillEntity } from './bill/entity/bill.entity';
import { BillStatus, BillType } from './bill/dto/bill.dto';
import { Role } from './enumeration/role.enum';
import { WalletType } from './wallet/dto/wallet.dto';

const opts = {
  type: 'better-sqlite3',
  database: join(tmpdir(), 'okbong-seed.db'),
  synchronize: true,
  entities: [UserEntity, WalletEntity, BillEntity],
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

  const bob = new UserEntity();
  bob.email = 'bob@nextrading.local';
  bob.fullName = 'Bob Nguyễn';
  bob.passwordHash = 'scrypt$xx$yy';
  bob.role = Role.USER;
  bob.status = UserStatus.ACTIVE;

  const alice = new UserEntity();
  alice.email = 'alice@nextrading.local';
  alice.fullName = 'Alice Trần';
  alice.passwordHash = 'scrypt$xx$yy';
  alice.role = Role.USER;
  alice.status = UserStatus.ACTIVE;

  const admin = new UserEntity();
  admin.email = 'admin@nextrading.local';
  admin.fullName = 'Admin NexTrading';
  admin.passwordHash = 'scrypt$xx$yy';
  admin.role = Role.ADMIN;
  admin.status = UserStatus.ACTIVE;

  const [savedBob, savedAlice, savedAdmin] = await userRepo.save([bob, alice, admin]);

  const bobWallet = new WalletEntity();
  bobWallet.userId = savedBob.id;
  bobWallet.type = WalletType.E_WALLET;
  bobWallet.balance = 1200000;
  bobWallet.currency = 'BDSD';
  bobWallet.status = WalletStatus.ACTIVE;

  const aliceWallet = new WalletEntity();
  aliceWallet.userId = savedAlice.id;
  aliceWallet.type = WalletType.E_WALLET;
  aliceWallet.balance = 850000;
  aliceWallet.currency = 'BDSD';
  aliceWallet.status = WalletStatus.ACTIVE;

  const [bobW, aliceW] = await walletRepo.save([bobWallet, aliceWallet]);

  const b1 = new BillEntity();
  b1.userId = savedBob.id;
  b1.amount = 150000;
  b1.type = BillType.RECURRING;
  b1.status = BillStatus.PENDING;
  b1.description = 'Internet September';

  const b2 = new BillEntity();
  b2.userId = savedAlice.id;
  b2.amount = 250000;
  b2.type = BillType.RECURRING;
  b2.status = BillStatus.PAID;
  b2.description = 'Electricity August';

  const b3 = new BillEntity();
  b3.userId = savedBob.id;
  b3.amount = 50000;
  b3.type = BillType.PAYMENT;
  b3.status = BillStatus.PENDING;
  b3.description = 'Parking fee';

  const bills = await billRepo.save([b1, b2, b3]);

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
