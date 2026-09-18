import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ActivityAction } from '../admin/entities/activity-log.entity';
import { ActivityLogService } from '../admin/services/activity-log.service';
import { OrderGateway } from './order.gateway';
import { OrderStatus } from './dto/order.dto';
import { OrderType } from './dto/order-type.enum';
import { OrderEntity } from './entity/order.entity';
import { OrderService } from './order.service';

const ADMIN_ID = '00000000-0000-4000-a000-00000000000a';
const ORDER_ID = '00000000-0000-4000-a000-0000000000b1';

type MockOrderRepo = {
  findOne: ReturnType<typeof vi.fn>;
  findOneBy: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  findAndCount: ReturnType<typeof vi.fn>;
};

function buildOrder(overrides: Partial<OrderEntity> = {}): OrderEntity {
  return {
    id: ORDER_ID,
    userId: '00000000-0000-4000-a000-000000000001',
    pair: 'BTC/USDT',
    side: 'buy',
    amount: 1,
    price: 26000,
    type: OrderType.LIMIT,
    filledAmount: 1,
    status: OrderStatus.COMPLETED,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
    ...overrides,
  } as OrderEntity;
}

describe('OrderService — correctResult', () => {
  let service: OrderService;
  let orderRepository: MockOrderRepo;
  let gateway: {
    broadcastOrderCreated: ReturnType<typeof vi.fn>;
    broadcastOrderCancelled: ReturnType<typeof vi.fn>;
    broadcastOrderMatched: ReturnType<typeof vi.fn>;
    broadcastOrderUpdated: ReturnType<typeof vi.fn>;
  };
  let activityLog: { record: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    orderRepository = {
      findOne: vi.fn(),
      findOneBy: vi.fn(),
      create: vi.fn((v: Partial<OrderEntity>) => v),
      save: vi.fn(async (entity: OrderEntity) => ({ ...entity })),
      findAndCount: vi.fn(),
    };
    gateway = {
      broadcastOrderCreated: vi.fn(),
      broadcastOrderCancelled: vi.fn(),
      broadcastOrderMatched: vi.fn(),
      broadcastOrderUpdated: vi.fn(),
    };
    activityLog = { record: vi.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: getRepositoryToken(OrderEntity), useValue: orderRepository },
        { provide: OrderGateway, useValue: gateway },
        { provide: ActivityLogService, useValue: activityLog },
        { provide: DataSource, useValue: {} },
      ],
    }).compile();

    service = module.get(OrderService);
  });

  it('đính chính COMPLETED → CANCELLED và ghi audit kèm giá trị cũ', async () => {
    orderRepository.findOneBy.mockResolvedValue(buildOrder({ status: OrderStatus.COMPLETED }));

    const result = await service.correctResult(
      ORDER_ID,
      { status: OrderStatus.CANCELLED, reason: 'Sai khớp lệnh' },
      ADMIN_ID,
    );

    expect(result.status).toBe(OrderStatus.CANCELLED);
    expect(orderRepository.save).toHaveBeenCalledTimes(1);
    expect(gateway.broadcastOrderCancelled).toHaveBeenCalledTimes(1);

    const [entry] = activityLog.record.mock.calls[0];
    expect(entry.action).toBe(ActivityAction.ORDER_CORRECT);
    expect(entry.userId).toBe(ADMIN_ID);
    expect(entry.metadata).toMatchObject({
      orderId: ORDER_ID,
      reason: 'Sai khớp lệnh',
      previousStatus: OrderStatus.COMPLETED,
      status: OrderStatus.CANCELLED,
    });
  });

  it('đính chính khối lượng khớp và giá của lệnh đã COMPLETED', async () => {
    orderRepository.findOneBy.mockResolvedValue(buildOrder({ status: OrderStatus.COMPLETED }));

    const result = await service.correctResult(
      ORDER_ID,
      { status: OrderStatus.COMPLETED, filledAmount: 0.25, price: 25500, reason: 'Khớp thiếu' },
      ADMIN_ID,
    );

    expect(Number(result.filledAmount)).toBe(0.25);
    expect(Number(result.price)).toBe(25500);
    expect(gateway.broadcastOrderMatched).toHaveBeenCalledTimes(1);
    expect(gateway.broadcastOrderUpdated).toHaveBeenCalledTimes(1);
  });

  it('400: từ chối đính chính khi lệnh chưa kết thúc', async () => {
    orderRepository.findOneBy.mockResolvedValue(buildOrder({ status: OrderStatus.PENDING }));

    await expect(
      service.correctResult(
        ORDER_ID,
        { status: OrderStatus.CANCELLED, reason: 'thử' },
        ADMIN_ID,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(orderRepository.save).not.toHaveBeenCalled();
    expect(activityLog.record).not.toHaveBeenCalled();
  });

  it('400: khối lượng khớp vượt khối lượng lệnh', async () => {
    orderRepository.findOneBy.mockResolvedValue(
      buildOrder({ status: OrderStatus.COMPLETED, amount: 1, filledAmount: 1 }),
    );

    await expect(
      service.correctResult(
        ORDER_ID,
        { status: OrderStatus.COMPLETED, filledAmount: 5, reason: 'thử' },
        ADMIN_ID,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(orderRepository.save).not.toHaveBeenCalled();
  });

  it('404: lệnh không tồn tại', async () => {
    orderRepository.findOneBy.mockResolvedValue(null);

    await expect(
      service.correctResult(
        ORDER_ID,
        { status: OrderStatus.CANCELLED, reason: 'thử' },
        ADMIN_ID,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lỗi ghi audit không làm hỏng việc đính chính', async () => {
    orderRepository.findOneBy.mockResolvedValue(buildOrder({ status: OrderStatus.COMPLETED }));
    activityLog.record.mockRejectedValue(new Error('audit down'));

    const result = await service.correctResult(
      ORDER_ID,
      { status: OrderStatus.CANCELLED, reason: 'thử' },
      ADMIN_ID,
    );

    expect(result.status).toBe(OrderStatus.CANCELLED);
  });
});