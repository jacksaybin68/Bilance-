import { Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { createClient, RedisClientType } from 'redis';
import { QueueService } from './queue.service';

export interface AppQueue {
  addJob(data: { type: string; payload: Record<string, unknown> }): Promise<{ id: string }>;
  getQueue(): Queue<unknown> | null;
  getRedisClient(): RedisClientType | null;
}

@Module({
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule implements OnModuleInit, OnModuleDestroy {
  private queue: Queue<unknown> | null = null;
  private redisClient: RedisClientType | null = null;

  async onModuleInit() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    try {
      this.redisClient = createClient({ url: redisUrl });
      await this.redisClient.connect();
      this.queue = new Queue('okbong-queue', { connection: this.redisClient });
      console.log('[Queue] Connected to Redis');
    } catch (err) {
      console.warn('[Queue] Redis unavailable — operating in mock mode.', (err as Error).message);
    }
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }

  async addJob(data: { type: string; payload: Record<string, unknown> }): Promise<{ id: string }> {
    if (!this.queue) {
      return { id: `mock-${Date.now()}` };
    }
    const job = await this.queue.add(data.type, data.payload);
    return { id: String(job.id) };
  }

  getQueue(): Queue<unknown> | null {
    return this.queue;
  }

  getRedisClient(): RedisClientType | null {
    return this.redisClient;
  }
}
