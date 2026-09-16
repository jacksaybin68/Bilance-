import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { hashPassword } from '../common/utils/password.util';
import { Role } from '../enumeration/role.enum';
import { CreateUserDto, UpdateUserDto, UserQueryDto } from './dto/user.dto';
import { UserEntity, UserStatus } from './entity/user.entity';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { email: email.toLowerCase().trim() } });
  }

  async findByEmailWithPassword(email: string): Promise<UserEntity | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('LOWER(user.email) = LOWER(:email)', { email: email.trim() })
      .getOne();
  }

  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    const email = createUserDto.email.toLowerCase().trim();
    const existing = await this.findByEmail(email);
    if (existing) throw new ConflictException('Email is already registered');

    const user = this.userRepository.create({
      email,
      fullName: createUserDto.fullName ?? undefined,
      passwordHash: await hashPassword(createUserDto.password),
      role: createUserDto.role ?? Role.USER,
      status: createUserDto.status ?? UserStatus.ACTIVE,
    });

    return this.userRepository.save(user);
  }

  async findAll(query: UserQueryDto = {}): Promise<PaginatedResult<UserEntity>> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;

    const base: FindOptionsWhere<UserEntity> = {};
    if (query.role) base.role = query.role;
    if (query.status) base.status = query.status;

    const where: FindOptionsWhere<UserEntity>[] = query.search
      ? [
          { ...base, email: ILike(`%${query.search}%`) },
          { ...base, fullName: ILike(`%${query.search}%`) },
        ]
      : [base];

    const [items, total] = await this.userRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total };
  }

  async findOne(id: string): Promise<UserEntity> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) throw new NotFoundException(`User ${id} was not found`);
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.findOne(id);

    if (updateUserDto.email) {
      const email = updateUserDto.email.toLowerCase().trim();
      const owner = await this.findByEmail(email);
      if (owner && owner.id !== id) throw new ConflictException('Email is already registered');
      user.email = email;
    }

    if (updateUserDto.fullName !== undefined) user.fullName = updateUserDto.fullName;
    if (updateUserDto.role !== undefined) user.role = updateUserDto.role;
    if (updateUserDto.status !== undefined) user.status = updateUserDto.status;

    return this.userRepository.save(user);
  }

  // ─── Two-Factor Authentication helpers ───────────────────────────────────

  /** Lưu secret TOTP tạm thời (chưa bật 2FA cho đến khi người dùng verify). */
  async saveTempTwoFactorSecret(userId: string, secret: string): Promise<void> {
    const user = await this.findOne(userId);
    user.twoFactorSecret = secret;
    user.twoFactorEnabled = false;
    await this.userRepository.save(user);
  }

  /** Bật 2FA sau khi mã TOTP đã được xác thực thành công. */
  async enableTwoFactor(userId: string, secret: string): Promise<UserEntity> {
    const user = await this.findOne(userId);
    user.twoFactorSecret = secret;
    user.twoFactorEnabled = true;
    return this.userRepository.save(user);
  }

  /** Tắt 2FA và xoá secret khỏi DB. */
  async disableTwoFactor(userId: string): Promise<UserEntity> {
    const user = await this.findOne(userId);
    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    return this.userRepository.save(user);
  }
}
