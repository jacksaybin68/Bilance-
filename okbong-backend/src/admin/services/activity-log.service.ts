import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityAction, ActivityLogEntity } from '../entities/activity-log.entity';

export interface RecordActivityInput {
  userId: string;
  action: ActivityAction;
  description?: string;
  metadata?: Record<string, unknown>;
}

/** Append-only audit trail shared by the admin management services. */
@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);

  constructor(
    @InjectRepository(ActivityLogEntity)
    private readonly activityLogRepository: Repository<ActivityLogEntity>,
  ) {}

  async record(input: RecordActivityInput): Promise<ActivityLogEntity> {
    const entry = this.activityLogRepository.create({
      userId: input.userId,
      action: input.action,
      description: input.description ?? null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    });
    const saved = await this.activityLogRepository.save(entry);
    this.logger.debug(`activity ${saved.action} recorded for user ${saved.userId}`);
    return saved;
  }

  async recent(limit = 50): Promise<ActivityLogEntity[]> {
    return this.activityLogRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
      relations: { user: true },
    });
  }
}