import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly redisUrl: string | undefined;
  private pubClient: RedisClientType | null = null;
  private subClient: RedisClientType | null = null;
  private connected = false;

  constructor(private readonly config: ConfigService) {
    this.redisUrl = this.config.get<string | undefined>('REDIS_URL');
  }

  get isAvailable(): boolean {
    return this.connected;
  }

  async ensureConnected(): Promise<void> {
    if (this.connected || !this.redisUrl) return;

    try {
      this.pubClient = createClient({ url: this.redisUrl });
      this.subClient = this.pubClient.duplicate();
      await Promise.all([this.pubClient.connect(), this.subClient.connect()]);
      this.connected = true;
      this.logger.log('Redis connected');
    } catch (err) {
      this.logger.warn(
        `Redis unavailable — operating without cache/adapter. ${(err as Error).message}`,
      );
      this.connected = false;
    }
  }

  getPubClient(): RedisClientType | null {
    return this.pubClient;
  }

  getSubClient(): RedisClientType | null {
    return this.subClient;
  }

  async onModuleDestroy(): Promise<void> {
    const clients = [this.pubClient, this.subClient].filter(Boolean) as RedisClientType[];
    await Promise.allSettled(clients.map((c) => c.quit()));
  }
}
