import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { WalletService } from '../wallet/wallet.service';
import { WalletType } from '../wallet/dto/wallet.dto';
import { OrderEntity } from './entity/order.entity';
import { OrderStatus } from './dto/order.dto';
import { OrderGateway } from './order.gateway';

export interface PaginatedOrders {
  items: OrderEntity[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    private readonly walletService: WalletService,
    private readonly orderGateway: OrderGateway,
  ) {}

  /**
   * Đặt lệnh: trừ ngay số tiền cược khỏi ví (Công/Trừ điểm), ghi lệnh pending.
   * Admin sau đó xác nhận kết quả win (công tiền thưởng) hoặc lose.
   */
  async createOrder(
    userId: string,
    input: { pair: string; side: 'buy' | 'sell'; amount: number; price?: number; type?: string },
  ): Promise<OrderEntity> {
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Số tiền đặt lệnh không hợp lệ');
    }

    // Trừ tiền cược ngay khi đặt lệnh.
    await this.walletService.adjust(
      userId,
      -amount,
      WalletType.E_WALLET,
      `Trừ điểm cho lệnh ${input.side === 'buy' ? 'mua' : 'bán'} ${input.pair}`,
      'order-hold',
    );

    const order = this.orderRepository.create({
      userId,
      pair: input.pair,
      side: input.side,
      amount,
      price: input.price ?? 0,
      type: (input.type as never) ?? undefined,
      status: OrderStatus.PENDING,
    });

    const saved = await this.orderRepository.save(order);
    this.orderGateway.broadcastOrderCreated(saved);
    return saved;
  }

  async listOrders(query: {
    side?: 'buy' | 'sell';
    status?: OrderStatus;
    userId?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedOrders> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;

    const where: FindOptionsWhere<OrderEntity> = {};
    if (query.side) where.side = query.side;
    if (query.status) where.status = query.status;
    if (query.userId) where.userId = query.userId;

    const [items, total] = await this.orderRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async findOne(id: string): Promise<OrderEntity> {
    const order = await this.orderRepository.findOneBy({ id });
    if (!order) throw new NotFoundException(`Order ${id} was not found`);
    return order;
  }

  /** My order list (user-scoped). */
  async listMine(userId: string, query: {
    side?: 'buy' | 'sell';
    status?: OrderStatus;
    page?: number;
    limit?: number;
  }): Promise<PaginatedOrders> {
    return this.listOrders({ ...query, userId });
  }

  /**
   * Admin điều chỉnh kết quả lệnh.
   * - win: cộng tiền thưởng = amount × 2 (gốc + thưởng).
   * - lose: không cộng (tiền cược đã trừ khi đặt lệnh).
   * Không cho điều chỉnh lại cùng kết quả trên lệnh đã settled.
   */
  async setOrderResult(
    orderId: string,
    result: 'win' | 'lose',
    actorId: string,
    note?: string,
  ): Promise<OrderEntity> {
    const order = await this.findOne(orderId);

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(`Lệnh ${orderId} đã có kết quả (${order.status})`);
    }

    const amount = Number(order.amount);

    if (result === 'win') {
      // Công điểm: hoàn gốc + thưởng tương đương tiền cược (2×).
      await this.walletService.adjust(
        order.userId,
        amount * 2,
        WalletType.E_WALLET,
        `Thắng lệnh ${order.pair} — cộng ${amount * 2} điểm`,
        `order-${orderId}`,
      );
    }

    order.status = result === 'win' ? OrderStatus.WIN : OrderStatus.LOSE;
    order.note = note ?? null;
    order.settledBy = actorId;

    const saved = await this.orderRepository.save(order);
    this.orderGateway.broadcastOrderMatched(saved);

    this.logger.log(
      `Admin ${actorId} set order ${orderId} → ${result} (${amount} BDSD)`,
    );
    return saved;
  }
}