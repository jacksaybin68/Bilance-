import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { roundAmount } from '../common/utils/amount.util';
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

    return this.billRepository.save(bill);
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
