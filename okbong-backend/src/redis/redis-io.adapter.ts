import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient, type RedisClientType } from 'redis';
import type { Server, ServerOptions } from 'socket.io';

/** Socket.IO adapter that scales across instances via Redis pub/sub. */
export class RedisIoAdapter extends IoAdapter {
  private pubClient?: RedisClientType;
  private subClient?: RedisClientType;
  private readonly redisUrl: string | undefined;

  constructor(app: INestApplication) {
    super(app);
    this.redisUrl = app.get(ConfigService, { strict: false }).get<string | undefined>('REDIS_URL');
  }

  async connectToRedis(): Promise<void> {
    if (!this.redisUrl) return;

    this.pubClient = createClient({ url: this.redisUrl });
    this.subClient = this.pubClient.duplicate();

    await Promise.all([this.pubClient.connect(), this.subClient.connect()]);
  }

  override createIOServer(port: number, options?: ServerOptions): Server {
    const server: Server = super.createIOServer(port, options) as Server;

    if (this.pubClient && this.subClient) {
      server.adapter(createAdapter(this.pubClient, this.subClient));
    }

    return server;
  }
}
