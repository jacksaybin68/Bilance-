import { Entity, Column, PrimaryGeneratedColumn, BeforeInsert, BeforeUpdate, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Role } from '../../enumeration/role.enum';
import { BillEntity } from '../../bill/entity/bill.entity';
import { hashPassword, verifyPassword } from '../../common/utils/password.util';
import { Exclude } from 'class-transformer';

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BANNED = 'banned',
}

@Entity()
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  @Exclude()
  passwordHash!: string;

  @Column({ nullable: true })
  fullName?: string;

  @Column({ type: 'varchar', length: 20, default: UserStatus.ACTIVE })
  status!: UserStatus;

  @Column({ type: 'varchar', length: 20, default: Role.USER })
  role!: Role;

  @Column({ type: 'varchar', length: 64, nullable: true })
  twoFactorSecret?: string | null;

  @Column({ type: 'boolean', default: false })
  twoFactorEnabled: boolean = false;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => BillEntity, (bill) => bill.user)
  bills!: BillEntity[];

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.passwordHash && !this.passwordHash.startsWith('scrypt$')) {
      this.passwordHash = await hashPassword(this.passwordHash);
    }
  }

  async comparePassword(password: string): Promise<boolean> {
    return verifyPassword(password, this.passwordHash);
  }
}

export interface UserJwtPayload {
  email: string;
  sub: string;
  role: Role;
}
