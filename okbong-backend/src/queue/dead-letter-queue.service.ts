import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class DeadLetterQueueService {
  private readonly logger = new Logger(DeadLetterQueueService.name);
  private dlq: import('bullmq').Queue | null = null;
  private readonly enabled: boolean;

  constructor(
    private readonly config: ConfigService,
    private readonly redisService: RedisService,
  ) {
    this.enabled = Boolean(this.config.get<string>('DEAD_LETTER_QUEUE_ENABLED'));
  }

  async onModuleInit(): Promise<void> {
    if (!this.enabled) {
      this.logger.log('Dead-letter queue is disabled');
      return;
    }

    if (!this.redisService.isAvailable) {
      this.logger.warn('Redis unavailable — DLQ disabled');
      return;
    }

    const redisUrl = this.config.get<string>('REDIS_URL');
    if (!redisUrl) {
      this.logger.warn('REDIS_URL not set — DLQ disabled');
      return;
    }

    const { Queue } = await import('bullmq');
    this.dlq = new Queue('okbong-dlq', { connection: { url: redisUrl } });
    this.logger.log('Dead-letter queue ready');
  }

  async forwardFailedJob(jobId: string, name: string, payload: Record<string, unknown>, error: Error): Promise<void> {
    if (!this.dlq) {
      this.logger.warn(`Cannot forward failed job ${jobId} — DLQ not available`);
      return;
    }

    try {
      await this.dlq.add('failed-job', {
        originalJobId: jobId,
        jobName: name,
        payload,
        errorMessage: error.message,
        errorStack: error.stack,
        failedAt: new Date().toISOString(),
      });
      this.logger.warn(`Forwarded failed job ${jobId} (${name}) to DLQ`);
    } catch (err) {
      this.logger.error(`Failed to forward job ${jobId} to DLQ: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async getFailedJobs(): Promise<import('bullmq').Job[]> {
    if (!this.dlq) return [];
    const jobs = await this.dlq.getJobs(['failed', 'delayed', 'waiting', 'active', 'completed'], 0, 100);
    return jobs.filter((j) => j.failedReason);
  }

  async retryJob(jobId: string): Promise<boolean> {
    if (!this.dlq) return false;
    const job = await this.dlq.getJob(jobId);
    if (!job) return false;
    await job.retry();
    return true;
  }

  async clearDLQ(): Promise<void> {
    if (!this.dlq) return;
    await this.dlq.clean(0, 100, 'completed');
    this.logger.log('DLQ cleared');
  }
}
