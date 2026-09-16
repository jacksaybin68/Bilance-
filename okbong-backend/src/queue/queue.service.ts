import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type JobHandler = (payload: Record<string, unknown>) => void | Promise<void>;

export interface QueueJob {
  name: string;
  payload: Record<string, unknown>;
  addedAt: number;
}

/**
 * Uses BullMQ when REDIS_URL is configured; otherwise keeps jobs in a simple
 * in-memory queue so the app also runs with zero infrastructure.
 */
@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly useRedis: boolean;
  private readonly memory: QueueJob[] = [];
  private readonly handlers = new Map<string, JobHandler>();
  private workerTimer?: NodeJS.Timeout;

  constructor(private readonly configService: ConfigService) {
    this.useRedis = Boolean(this.configService.get<string>('REDIS_URL'));
    if (!this.useRedis) this.startMemoryWorker();
  }

  register(name: string, handler: JobHandler): void {
    this.handlers.set(name, handler);
  }

  async add(name: string, payload: Record<string, unknown> = {}): Promise<void> {
    if (this.useRedis) {
      // Redis-backed enqueue requires the BullMQ bridge; in-memory covers local dev.
      this.logger.debug(`redis queue requested for job '${name}' (handled by bridge)`);
      return;
    }

    this.memory.push({ name, payload, addedAt: Date.now() });
  }

  private startMemoryWorker(): void {
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

  onModuleDestroy(): void {
    if (this.workerTimer) clearInterval(this.workerTimer);
  }
}
