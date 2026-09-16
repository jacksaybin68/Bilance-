import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AppInfo {
  name: string;
  version: string;
  environment: string;
  uptime: number;
  timestamp: string;
}

export interface HealthStatus {
  status: 'ok' | 'degraded';
  uptime: number;
  version: string;
  timestamp: string;
}

@Injectable()
export class AppService {
  private readonly startedAt = Date.now();

  constructor(private readonly configService: ConfigService) {}

  getInfo(): AppInfo {
    return {
      name: 'OKBong API',
      version: this.configService.get<string>('APP_VERSION', '1.0'),
      environment: this.configService.get<string>('NODE_ENV', 'development'),
      uptime: this.uptimeInSeconds(),
      timestamp: new Date().toISOString(),
    };
  }

  getHealth(): HealthStatus {
    return {
      status: 'ok',
      uptime: this.uptimeInSeconds(),
      version: this.configService.get<string>('APP_VERSION', '1.0'),
      timestamp: new Date().toISOString(),
    };
  }

  private uptimeInSeconds(): number {
    return Math.floor((Date.now() - this.startedAt) / 1000);
  }
}
