import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, type Job } from 'bullmq';
import { RedisService } from '../redis/redis.service';
import { DeadLetterQueueService } from './dead-letter-queue.service';

export type JobHandler = (payload: Record<string, unknown>) => void | Promise<void>;

export interface QueueJob {
  name: string;
  payload: Record<string, unknown>;
  addedAt: number;
}

/**
 * Queue abstraction: uses BullMQ when Redis is connected; otherwise falls back
 * to a simple in-memory queue so the app also runs with zero infrastructure.
 */
@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly memory: QueueJob[] = [];
  private readonly handlers = new Map<string, JobHandler>();
  private workerTimer?: ReturnType<typeof setInterval>;

  private queue: Queue | null = null;
  private worker: Worker | null = null;
  private useRedis = false;

  constructor(
    private readonly config: ConfigService,
    private readonly redisService: RedisService,
    private readonly dlqService: DeadLetterQueueService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.useRedis = Boolean(this.config.get<string>('REDIS_URL'));

    if (this.useRedis) {
      await this.redisService.ensureConnected();

      const redisUrl = this.config.get<string>('REDIS_URL');
      if (this.redisService.isAvailable && redisUrl) {
        try {
          const connection = { url: redisUrl };
          this.queue = new Queue('okbong-queue', { connection });
          this.worker = new Worker(
            'okbong-queue',
            async (job: Job) => {
              const handler = this.handlers.get(job.name);
              if (!handler) {
                this.logger.warn(`no handler for job '${job.name}'`);
                return;
              }
              await Promise.resolve(handler(job.data as Record<string, unknown>));
            },
            { connection, concurrency: 5 },
          );
          this.worker.on('failed', async (job, err) => {
            this.logger.error(`job '${job?.name}' (${job?.id}) failed: ${err.message}`);
            await this.dlqService.forwardFailedJob(
              String(job?.id ?? 'unknown'),
              job?.name ?? 'unknown',
              job?.data as Record<string, unknown> ?? {},
              err as Error,
            );
          });
          this.worker.on('error', (err) => {
            this.logger.error(`worker error: ${err.message}`);
          });
          this.logger.log('BullMQ queue + worker ready');
        } catch (err) {
          this.logger.warn(
            `BullMQ init failed, falling back to in-memory queue. ${(err as Error).message}`,
          );
          this.queue = null;
          this.worker = null;
          this.useRedis = false;
          this.startMemoryWorker();
        }
        return;
      }
    }

    this.logger.log('No Redis — using in-memory queue');
    this.startMemoryWorker();
  }

  register(name: string, handler: JobHandler): void {
    this.handlers.set(name, handler);
  }

  async add(name: string, payload: Record<string, unknown> = {}): Promise<{ id: string }> {
    if (this.useRedis && this.queue) {
      const job = await this.queue.add(name, payload);
      return { id: String(job.id) };
    }

    this.memory.push({ name, payload, addedAt: Date.now() });
    return { id: `mock-${Date.now()}` };
  }

  private startMemoryWorker(): void {
    if (this.workerTimer) return;
    this.workerTimer = setInterval(() => {
      const job = this.memory.shift();
      if (!job) return;

      const handler = this.handlers.get(job.name);
      if (!handler) {
        this.logger.warn(`no handler for job '${job.name}'`);
        return;
      }

      void Promise.resolve(handler(job.payload)).catch((error: unknown) =>
        this.logger.error(
          `job '${job.name}' failed: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }, 1_000);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.workerTimer) clearInterval(this.workerTimer);
    if (this.worker) await this.worker.close();
    if (this.queue) await this.queue.close();
  }
}
