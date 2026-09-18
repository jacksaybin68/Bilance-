import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, In, Repository } from 'typeorm';
import { roundAmount } from '../common/utils/amount.util';
import { Role } from '../enumeration/role.enum';
import { ActivityAction } from '../admin/entities/activity-log.entity';
import { ActivityLogService } from '../admin/services/activity-log.service';
import { UserEntity } from '../user/entity/user.entity';
import { OrderGateway } from './order.gateway';
import {
  AdminCorrectOrderDto,
  AdminOrderResultDto,
  CreateOrderDto,
  OrderQueryDto,
} from './dto/order-query.dto';
import { OrderStatus } from './dto/order.dto';
import { OrderType } from './dto/order-type.enum';
import { OrderEntity } from './entity/order.entity';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Transitions an order may legally move through (ADR 002 §3). */
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [
    OrderStatus.MATCHING,
    OrderStatus.MATCHED,
    OrderStatus.COMPLETED,
    OrderStatus.CANCELLED,
    OrderStatus.EXPIRED,
  ],
  [OrderStatus.MATCHING]: [
    OrderStatus.PENDING,
    OrderStatus.MATCHED,
    OrderStatus.COMPLETED,
    OrderStatus.CANCELLED,
    OrderStatus.EXPIRED,
  ],
  [OrderStatus.MATCHED]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED, OrderStatus.MATCHED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.EXPIRED]: [],
};

/** Statuses an order can no longer leave through the normal transition table. */
const TERMINAL_ORDER_STATUSES: readonly OrderStatus[] = [
  OrderStatus.COMPLETED,
  OrderStatus.CANCELLED,
  OrderStatus.EXPIRED,
];

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    private readonly orderGateway: OrderGateway,
    private readonly activityLogService: ActivityLogService,
    private readonly dataSource: DataSource,
  ) {}

  // ── User-facing operations ───────────────────────────────────────
  async create(userId: string, dto: CreateOrderDto): Promise<OrderEntity> {
    const order = this.orderRepository.create({
      userId,
      pair: dto.pair.toUpperCase(),
      side: dto.side,
      amount: roundAmount(dto.amount),
      price: roundAmount(dto.price),
      type: dto.type ?? OrderType.LIMIT,
      filledAmount: 0,
      status: OrderStatus.PENDING,
    });

    const saved = await this.orderRepository.save(order);
    this.orderGateway.broadcastOrderCreated(saved);
    return saved;
  }

  async listForUser(userId: string, query: OrderQueryDto): Promise<PaginatedResult<OrderEntity>> {
    return this.list({ ...query, userId });
  }

  async list(query: OrderQueryDto): Promise<PaginatedResult<OrderEntity & { userEmail?: string | null }>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: FindOptionsWhere<OrderEntity> = {};
    if (query.userId) where.userId = query.userId;
    if (query.status) where.status = query.status;
    if (query.pair) where.pair = query.pair.toUpperCase();
    if (query.side) where.side = query.side;

    const [items, total] = await this.orderRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const emails = await this.userEmailsFor(items.map((order) => order.userId));

    return {
      items: items.map((order) => ({ ...order, userEmail: emails.get(order.userId) ?? null })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** Owner emails for the given user ids, used to label admin-facing lists. */
  private async userEmailsFor(userIds: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(userIds)];
    if (unique.length === 0) return new Map();

    const users = await this.dataSource
      .getRepository(UserEntity)
      .find({ where: { id: In(unique) }, select: { id: true, email: true } });

    return new Map(users.map((user) => [user.id, user.email]));
  }

  async findOne(id: string): Promise<OrderEntity> {
    const order = await this.orderRepository.findOneBy({ id });
    if (!order) throw new NotFoundException(`Order ${id} was not found`);
    return order;
  }

  async findOneForUser(id: string, user: { id: string; role: Role }): Promise<OrderEntity> {
    const order = await this.findOne(id);
    if (!this.isStaff(user.role) && order.userId !== user.id) {
      throw new ForbiddenException('You can only access your own orders');
    }
    return order;
  }

  async cancel(id: string, user: { id: string; role: Role }): Promise<OrderEntity> {
    const order = await this.findOneForUser(id, user);
    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.MATCHING) {
      throw new BadRequestException(`Cannot cancel an order in status ${order.status}`);
    }

    order.status = OrderStatus.CANCELLED;
    const saved = await this.orderRepository.save(order);
    this.orderGateway.broadcastOrderCancelled(saved);
    return saved;
  }

  // ── Admin operations ─────────────────────────────────────────────
  async stats(): Promise<{
    total: number;
    byStatus: Record<OrderStatus, number>;
    bySide: { buy: number; sell: number };
    filledVolume: number;
  }> {
    const statuses = Object.values(OrderStatus);
    const counts = await Promise.all(
      statuses.map((status) => this.orderRepository.count({ where: { status } })),
    );
    const byStatus = statuses.reduce<Record<OrderStatus, number>>(
      (acc, status, index) => {
        acc[status] = counts[index];
        return acc;
      },
      {} as Record<OrderStatus, number>,
    );

    const [buy, sell] = await Promise.all([
      this.orderRepository.count({ where: { side: 'buy' } }),
      this.orderRepository.count({ where: { side: 'sell' } }),
    ]);

    const filled = await this.orderRepository.find({ select: { filledAmount: true, price: true } });
    const filledVolume = roundAmount(
      filled.reduce((sum, order) => sum + Number(order.filledAmount) * Number(order.price), 0),
    );

    return { total: counts.reduce((sum, value) => sum + value, 0), byStatus, bySide: { buy, sell }, filledVolume };
  }

  /**
   * Admin override of an order's result. The status is validated against the
   * lifecycle table and `filledAmount` is rejected when it exceeds [0, amount]
   * so an override can never over-fill or resurrect a terminal order.
   */
  async overrideResult(
    id: string,
    dto: AdminOrderResultDto,
    adminId: string,
  ): Promise<OrderEntity> {
    const order = await this.findOne(id);

    const allowed = ALLOWED_TRANSITIONS[order.status];
    if (order.status !== dto.status && !allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Illegal order transition ${order.status} → ${dto.status}`,
      );
    }

    if (dto.filledAmount !== undefined) {
      const requested = roundAmount(dto.filledAmount);
      if (requested > Number(order.amount)) {
        throw new BadRequestException(
          `filledAmount ${requested} exceeds the order amount ${order.amount}`,
        );
      }
      order.filledAmount = requested;
    }

    // A terminal "completed" status implies a full fill unless told otherwise.
    if (dto.status === OrderStatus.COMPLETED && dto.filledAmount === undefined) {
      order.filledAmount = Number(order.amount);
    }

    if (dto.price !== undefined) order.price = roundAmount(dto.price);
    order.status = dto.status;

    const saved = await this.orderRepository.save(order);

    if (saved.status === OrderStatus.CANCELLED) {
      this.orderGateway.broadcastOrderCancelled(saved);
    } else if (saved.status === OrderStatus.COMPLETED) {
      this.orderGateway.broadcastOrderMatched(saved);
      this.orderGateway.broadcastOrderUpdated(saved);
    } else {
      this.orderGateway.broadcastOrderUpdated(saved);
    }

    await this.recordAdminAction(
      adminId,
      ActivityAction.ORDER_UPDATE,
      `Điều chỉnh kết quả lệnh ${id} → ${dto.status}${dto.reason ? ` — ${dto.reason}` : ''}`,
      {
        orderId: id,
        status: dto.status,
        filledAmount: order.filledAmount,
        reason: dto.reason ?? null,
      },
    );

    this.logger.log(`admin ${adminId} overrode order ${id} to ${dto.status}`);
    return saved;
  }

  /**
   * Corrects the recorded result of an order that has already reached a terminal
   * status. `overrideResult` refuses these transitions by design, so this path is
   * the only way to fix a settled order — it therefore demands a reason and keeps
   * the previous values in the audit log.
   */
  async correctResult(
    id: string,
    dto: AdminCorrectOrderDto,
    adminId: string,
  ): Promise<OrderEntity> {
    const order = await this.findOne(id);

    if (!TERMINAL_ORDER_STATUSES.includes(order.status)) {
      throw new BadRequestException(
        `Order ${id} is still ${order.status}; use POST /admin/orders/${id}/result instead`,
      );
    }

    const previous = {
      status: order.status,
      filledAmount: Number(order.filledAmount),
      price: Number(order.price),
    };

    if (dto.filledAmount !== undefined) {
      const requested = roundAmount(dto.filledAmount);
      if (requested > Number(order.amount)) {
        throw new BadRequestException(
          `filledAmount ${requested} exceeds the order amount ${order.amount}`,
        );
      }
      order.filledAmount = requested;
    }

    if (dto.price !== undefined) order.price = roundAmount(dto.price);
    order.status = dto.status;

    const saved = await this.orderRepository.save(order);

    if (saved.status === OrderStatus.CANCELLED) {
      this.orderGateway.broadcastOrderCancelled(saved);
    } else if (saved.status === OrderStatus.COMPLETED) {
      this.orderGateway.broadcastOrderMatched(saved);
    }
    this.orderGateway.broadcastOrderUpdated(saved);

    await this.recordAdminAction(
      adminId,
      ActivityAction.ORDER_CORRECT,
      `Đính chính kết quả lệnh ${id}: ${previous.status} → ${dto.status} — ${dto.reason}`,
      {
        orderId: id,
        reason: dto.reason,
        previousStatus: previous.status,
        previousFilledAmount: previous.filledAmount,
        previousPrice: previous.price,
        status: dto.status,
        filledAmount: Number(saved.filledAmount),
        price: Number(saved.price),
      },
    );

    this.logger.warn(
      `admin ${adminId} corrected terminal order ${id}: ${previous.status} → ${dto.status} (${dto.reason})`,
    );
    return saved;
  }

  async adminCancel(id: string, adminId: string, reason?: string): Promise<OrderEntity> {
    const order = await this.findOne(id);
    if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.COMPLETED) {
      throw new BadRequestException(`Cannot cancel an order in status ${order.status}`);
    }

    order.status = OrderStatus.CANCELLED;
    const saved = await this.orderRepository.save(order);
    this.orderGateway.broadcastOrderCancelled(saved);

    await this.recordAdminAction(
      adminId,
      ActivityAction.BILL_UPDATE,
      `Huỷ lệnh ${id}${reason ? ` — ${reason}` : ''}`,
      { orderId: id, reason: reason ?? null },
    );

    return saved;
  }

  private isStaff(role: Role): boolean {
    return role === Role.ADMIN || role === Role.SUPER_ADMIN;
  }

  private async recordAdminAction(
    adminId: string,
    action: ActivityAction,
    description: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    // Audit logging must never fail the order update it describes.
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