import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '../enumeration/role.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { roundAmount } from '../common/utils/amount.util';
import { BillQueueService } from '../queue/index';
import { BillQueryDto, BillStatus, BillType } from './dto/bill.dto';
import { BillEntity } from './entity/bill.entity';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

@Injectable()
export class BillService {
  constructor(
    @InjectRepository(BillEntity)
    private readonly billRepository: Repository<BillEntity>,
    private readonly billQueueService: BillQueueService,
  ) {}

  async findAll(query: BillQueryDto = {}): Promise<PaginatedResult<BillEntity>> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;

    const where: FindOptionsWhere<BillEntity> = {};
    if (query.userId) where.userId = query.userId;
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;

    const [items, total] = await this.billRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total };
  }

  async findOne(id: string): Promise<BillEntity> {
    const bill = await this.billRepository.findOneBy({ id });
    if (!bill) throw new NotFoundException(`Bill ${id} was not found`);
    return bill;
  }

  async findOneForUser(id: string, user: AuthenticatedUser): Promise<BillEntity> {
    const bill = await this.findOne(id);
    const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;
    if (!isAdmin && bill.userId !== user.id) {
      throw new ForbiddenException('You can only access your own bills');
    }
    return bill;
  }

  async create(dto: {
    userId: string;
    amount: number;
    type: BillType;
    description?: string;
  }): Promise<BillEntity> {
    const bill = this.billRepository.create({
      userId: dto.userId,
      amount: roundAmount(dto.amount),
      type: dto.type,
      status: BillStatus.PENDING,
      description: dto.description ?? null,
    });

    const saved = await this.billRepository.save(bill);

    await this.billQueueService.onBillCreated({
      billId: saved.id,
      userId: saved.userId,
      type: saved.type,
      amount: saved.amount,
      description: saved.description,
    });

    return saved;
  }

  async update(
    id: string,
    patch: { status?: BillStatus; description?: string },
  ): Promise<BillEntity> {
    const bill = await this.findOne(id);
    if (patch.status !== undefined) bill.status = patch.status;
    if (patch.description !== undefined) bill.description = patch.description;
    return this.billRepository.save(bill);
  }
}