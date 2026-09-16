import { INestApplication } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import type { Server, ServerOptions } from 'socket.io';
import { RedisService } from './redis.service';

/** Socket.IO adapter that scales across instances via Redis pub/sub. */
export class RedisIoAdapter extends IoAdapter {
  private readonly redisService: RedisService;

  constructor(app: INestApplication) {
    super(app);
    this.redisService = app.get(RedisService);
  }

  async connectToRedis(): Promise<void> {
    await this.redisService.ensureConnected();
  }

  override createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, options) as Server;

    const pubClient = this.redisService.getPubClient();
    const subClient = this.redisService.getSubClient();

    if (pubClient && subClient) {
      server.adapter(createAdapter(pubClient, subClient));
      this.logger.log('Socket.IO using Redis adapter');
    } else {
      this.logger.log('Socket.IO in-memory adapter (Redis unavailable)');
    }

    return server;
  }
}