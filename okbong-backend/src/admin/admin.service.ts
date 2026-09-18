import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { hashPassword } from '../common/utils/password.util';
import { UserEntity, UserStatus } from '../user/entity/user.entity';
import { WalletEntity, WalletStatus } from '../wallet/entity/wallet.entity';
import { TransactionEntity, TransactionStatus } from '../wallet/entity/transaction.entity';
import { BillEntity } from '../bill/entity/bill.entity';
import { BillStatus } from '../bill/dto/bill.dto';
import { Role } from '../enumeration/role.enum';
import { ActivityAction, ActivityLogEntity } from './entities/activity-log.entity';
import { PlanEntity, PlanStatus } from './entities/plan.entity';
import { SystemSettingEntity, SettingValueType } from './entities/system-setting.entity';
import { ContentCategory, ContentPostEntity, ContentStatus } from './entities/content-post.entity';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Common list query for the admin console screens. */
export interface AdminListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  type?: string;
  role?: Role;
  userId?: string;
}

function paginate<T>(items: T[], total: number, page: number, limit: number): PaginatedResult<T> {
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(WalletEntity)
    private readonly walletRepository: Repository<WalletEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactionRepository: Repository<TransactionEntity>,
    @InjectRepository(BillEntity)
    private readonly billRepository: Repository<BillEntity>,
    @InjectRepository(ActivityLogEntity)
    private readonly activityLogRepository: Repository<ActivityLogEntity>,
    @InjectRepository(PlanEntity)
    private readonly planRepository: Repository<PlanEntity>,
    @InjectRepository(SystemSettingEntity)
    private readonly settingRepository: Repository<SystemSettingEntity>,
    @InjectRepository(ContentPostEntity)
    private readonly contentRepository: Repository<ContentPostEntity>,
  ) {}

  private resolvePage(query: AdminListQuery): { page: number; limit: number; skip: number } {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    return { page, limit, skip: (page - 1) * limit };
  }

  // ── User management ──────────────────────────────────────────────
  async userCount(): Promise<{ total: number; active: number; banned: number }> {
    const total = await this.userRepository.count();
    const active = await this.userRepository.count({ where: { status: UserStatus.ACTIVE } });
    const banned = await this.userRepository.count({ where: { status: UserStatus.BANNED } });
    return { total, active, banned };
  }

  async listUsers(query: AdminListQuery = {}): Promise<PaginatedResult<UserEntity>> {
    const { page, limit, skip } = this.resolvePage(query);

    const base: FindOptionsWhere<UserEntity> = {};
    if (query.status) base.status = query.status as UserStatus;
    if (query.role) base.role = query.role;

    const where: FindOptionsWhere<UserEntity>[] = query.search
      ? [
          { ...base, email: ILike(`%${query.search}%`) },
          { ...base, fullName: ILike(`%${query.search}%`) },
        ]
      : [base];

    const [items, total] = await this.userRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return paginate(items, total, page, limit);
  }

  async findUser(id: string): Promise<UserEntity> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) throw new NotFoundException(`User ${id} was not found`);
    return user;
  }

  async createUser(
    changes: {
      email: string;
      password: string;
      fullName?: string;
      role?: Role;
      status?: UserStatus;
    },
    actor?: { id: string },
  ): Promise<UserEntity> {
    const email = changes.email.toLowerCase().trim();
    const existing = await this.userRepository.findOneBy({ email });
    if (existing) throw new ConflictException('Email is already registered');

    const user = this.userRepository.create({
      email,
      fullName: changes.fullName,
      passwordHash: await hashPassword(changes.password),
      role: changes.role ?? Role.USER,
      status: changes.status ?? UserStatus.ACTIVE,
    });

    const saved = await this.userRepository.save(user);
    await this.logActivity(
      actor?.id ?? saved.id,
      ActivityAction.SETTINGS_CHANGE,
      `Tạo người dùng ${saved.email}`,
    );
    return saved;
  }

  async updateUser(
    id: string,
    changes: { fullName?: string; role?: Role; status?: UserStatus; email?: string },
    actor?: { id: string },
  ): Promise<UserEntity> {
    const user = await this.findUser(id);
    if (changes.fullName !== undefined) user.fullName = changes.fullName;
    if (changes.role !== undefined) user.role = changes.role;
    if (changes.status !== undefined) user.status = changes.status;
    if (changes.email !== undefined) user.email = changes.email.toLowerCase().trim();

    const saved = await this.userRepository.save(user);
    await this.logActivity(
      actor?.id ?? id,
      ActivityAction.SETTINGS_CHANGE,
      `Cập nhật người dùng ${saved.email}`,
    );
    return saved;
  }

  async banUser(userId: string, actor?: { id: string }): Promise<UserEntity> {
    if (actor?.id === userId) {
      throw new BadRequestException('Cannot ban your own account');
    }
    const user = await this.findUser(userId);
    user.status = UserStatus.BANNED;
    const saved = await this.userRepository.save(user);
    await this.logActivity(actor?.id ?? userId, ActivityAction.USER_BAN, `Khoá ${saved.email}`);
    return saved;
  }

  async unbanUser(userId: string, actor?: { id: string }): Promise<UserEntity> {
    const user = await this.findUser(userId);
    user.status = UserStatus.ACTIVE;
    const saved = await this.userRepository.save(user);
    await this.logActivity(actor?.id ?? userId, ActivityAction.USER_UNBAN, `Mở khoá ${saved.email}`);
    return saved;
  }

  async changeUserRole(userId: string, role: Role, actor?: { id: string }): Promise<UserEntity> {
    const user = await this.findUser(userId);
    if (actor?.id === userId && role !== user.role) {
      throw new BadRequestException('Cannot change your own role');
    }
    user.role = role;
    const saved = await this.userRepository.save(user);
    await this.logActivity(
      actor?.id ?? userId,
      ActivityAction.SETTINGS_CHANGE,
      `Đổi vai trò ${saved.email} → ${role}`,
    );
    return saved;
  }

  // ── Wallet management ────────────────────────────────────────────
  async walletCount(): Promise<{ total: number; active: number }> {
    const total = await this.walletRepository.count();
    const active = await this.walletRepository.count({ where: { status: WalletStatus.ACTIVE } });
    return { total, active };
  }

  async listWallets(query: AdminListQuery = {}): Promise<PaginatedResult<WalletEntity>> {
    const { page, limit, skip } = this.resolvePage(query);

    const where: FindOptionsWhere<WalletEntity> = {};
    if (query.status) where.status = query.status as WalletStatus;
    if (query.type) where.type = query.type as never;
    if (query.userId) where.userId = query.userId;

    const [items, total] = await this.walletRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return paginate(items, total, page, limit);
  }

  // ── Transaction / payment management ─────────────────────────────
  async listTransactions(query: AdminListQuery = {}): Promise<PaginatedResult<TransactionEntity>> {
    const { page, limit, skip } = this.resolvePage(query);

    const where: FindOptionsWhere<TransactionEntity> = {};
    if (query.status) where.status = query.status as never;
    if (query.type) where.type = query.type as never;
    if (query.userId) where.userId = query.userId;

    const [items, total] = await this.transactionRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return paginate(items, total, page, limit);
  }

  // ── Bill management ──────────────────────────────────────────────
  async billCount(): Promise<{ pending: number; paid: number; total: number }> {
    const total = await this.billRepository.count();
    const pending = await this.billRepository.count({ where: { status: BillStatus.PENDING } });
    const paid = await this.billRepository.count({ where: { status: BillStatus.PAID } });
    return { pending, paid, total };
  }

  async listBills(query: AdminListQuery = {}): Promise<PaginatedResult<BillEntity>> {
    const { page, limit, skip } = this.resolvePage(query);

    const where: FindOptionsWhere<BillEntity> = {};
    if (query.status) where.status = query.status as never;
    if (query.type) where.type = query.type as never;
    if (query.userId) where.userId = query.userId;

    const [items, total] = await this.billRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return paginate(items, total, page, limit);
  }

  // ── Plan management ──────────────────────────────────────────────
  async listPlans(): Promise<PlanEntity[]> {
    return this.planRepository.find({ order: { createdAt: 'DESC' } });
  }

  async createPlan(data: {
    name: string;
    price: number;
    duration?: string;
    features?: string[];
    status?: PlanStatus;
  }): Promise<PlanEntity> {
    return this.planRepository.save(
      this.planRepository.create({
        name: data.name,
        price: data.price,
        duration: data.duration ?? '1 month',
        features: data.features ?? [],
        status: data.status ?? PlanStatus.ACTIVE,
      }),
    );
  }

  async updatePlan(
    id: string,
    changes: { name?: string; price?: number; duration?: string; features?: string[]; status?: PlanStatus },
  ): Promise<PlanEntity> {
    const plan = await this.planRepository.findOneBy({ id });
    if (!plan) throw new NotFoundException(`Plan ${id} was not found`);
    Object.assign(plan, changes);
    return this.planRepository.save(plan);
  }

  // ── Transaction review ───────────────────────────────────────────
  async reviewTransaction(
    id: string,
    status: TransactionStatus,
    description?: string,
    actor?: { id: string },
  ): Promise<TransactionEntity> {
    const transaction = await this.transactionRepository.findOneBy({ id });
    if (!transaction) throw new NotFoundException(`Transaction ${id} was not found`);

    transaction.status = status;
    if (description !== undefined) transaction.description = description;
    const saved = await this.transactionRepository.save(transaction);

    if (actor) {
      await this.logActivity(
        actor.id,
        ActivityAction.WALLET_TRANSFER,
        `Duyệt giao dịch ${id} → ${status}`,
        { transactionId: id, status },
      );
    }
    return saved;
  }

  // ── Content (CMS) ────────────────────────────────────────────────
  async listPosts(query: AdminListQuery = {}): Promise<PaginatedResult<ContentPostEntity>> {
    const { page, limit, skip } = this.resolvePage(query);

    const where: FindOptionsWhere<ContentPostEntity> = {};
    if (query.status) where.status = query.status as never;
    if (query.type) where.category = query.type as never;
    if (query.search) where.title = ILike(`%${query.search}%`);

    const [items, total] = await this.contentRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return paginate(items, total, page, limit);
  }

  async createPost(
    data: {
      title: string;
      category?: ContentCategory;
      status?: ContentStatus;
      content?: string;
    },
    actor?: { id: string; email?: string },
  ): Promise<ContentPostEntity> {
    const status = data.status ?? ContentStatus.DRAFT;
    return this.contentRepository.save(
      this.contentRepository.create({
        title: data.title,
        category: data.category ?? ContentCategory.NEWS,
        status,
        content: data.content ?? '',
        authorId: actor?.id ?? null,
        author: actor?.email ?? null,
        publishedAt: status === ContentStatus.PUBLISHED ? new Date() : null,
      }),
    );
  }

  async updatePost(
    id: string,
    changes: {
      title?: string;
      category?: ContentCategory;
      status?: ContentStatus;
      content?: string;
    },
  ): Promise<ContentPostEntity> {
    const post = await this.contentRepository.findOneBy({ id });
    if (!post) throw new NotFoundException(`Post ${id} was not found`);

    const wasPublished = post.status === ContentStatus.PUBLISHED;
    Object.assign(post, changes);
    if (post.status === ContentStatus.PUBLISHED && !wasPublished) {
      post.publishedAt = new Date();
    }
    return this.contentRepository.save(post);
  }

  async deletePost(id: string): Promise<void> {
    const result = await this.contentRepository.delete({ id });
    if (!result.affected) throw new NotFoundException(`Post ${id} was not found`);
  }

  // ── System settings ──────────────────────────────────────────────
  async listSettings(): Promise<SystemSettingEntity[]> {
    const rows = await this.settingRepository.find({ order: { key: 'ASC' } });
    if (rows.length > 0) return rows;

    // Seed the editable defaults on first read so the screen is never blank.
    const defaults: Partial<SystemSettingEntity>[] = [
      { key: 'site_name', label: 'Tên hệ thống', value: 'NexTrading', valueType: SettingValueType.STRING },
      { key: 'support_email', label: 'Email hỗ trợ', value: 'support@nextrading.local', valueType: SettingValueType.STRING },
      { key: 'default_currency', label: 'Tiền tệ mặc định', value: 'BDSD', valueType: SettingValueType.STRING },
      { key: 'deposit_fee_percent', label: 'Phí nạp (%)', value: '0', valueType: SettingValueType.NUMBER },
      { key: 'withdraw_fee_percent', label: 'Phí rút (%)', value: '1', valueType: SettingValueType.NUMBER },
      { key: 'maintenance_mode', label: 'Chế độ bảo trì', value: 'false', valueType: SettingValueType.BOOLEAN },
      { key: 'kyc_required', label: 'Bắt buộc KYC', value: 'true', valueType: SettingValueType.BOOLEAN },
    ];
    return this.settingRepository.save(this.settingRepository.create(defaults));
  }

  async updateSettings(
    changes: Array<{ key: string; value: string }>,
    actor?: { id: string },
  ): Promise<SystemSettingEntity[]> {
    const rows = await this.listSettings();
    const byKey = new Map(rows.map((row) => [row.key, row]));

    for (const change of changes) {
      const row = byKey.get(change.key);
      if (!row) continue;
      row.value = String(change.value);
    }

    const saved = await this.settingRepository.save([...byKey.values()]);
    if (actor) {
      await this.logActivity(
        actor.id,
        ActivityAction.SETTINGS_CHANGE,
        `Cập nhật ${changes.length} cấu hình`,
        { keys: changes.map((change) => change.key) },
      );
    }
    return saved;
  }

  // ── Activity log ─────────────────────────────────────────────────
  /** Never throws: a failed audit write must not break the action it describes. */
  async logActivity(
    userId: string,
    action: ActivityAction,
    description?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.activityLogRepository.save(
        this.activityLogRepository.create({
          userId,
          action,
          description: description ?? null,
          metadata: metadata ? JSON.stringify(metadata) : null,
        }),
      );
    } catch (error) {
      this.logger.warn(`activity log failed: ${(error as Error).message}`);
    }
  }

  async recentActivity(limit = 50): Promise<ActivityLogEntity[]> {
    return this.activityLogRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
      relations: { user: true },
    });
  }

  // ── Dashboard ────────────────────────────────────────────────────
  async dashboardStats() {
    const [users, wallets, bills, transactions, activity] = await Promise.all([
      this.userCount(),
      this.walletCount(),
      this.billCount(),
      this.transactionRepository.count(),
      this.activityLogRepository.count(),
    ]);

    const balanceRow = await this.walletRepository
      .createQueryBuilder('wallet')
      .select('COALESCE(SUM(wallet.balance), 0)', 'total')
      .getRawOne<{ total: string | number }>();

    return {
      users,
      wallets,
      bills,
      transactions,
      activity,
      totalBalance: Number(balanceRow?.total ?? 0),
    };
  }
}
