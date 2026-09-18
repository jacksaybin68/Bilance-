import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { PaymentWebhookPayload } from './payment/payment-webhook.controller';

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
      name: 'NexTrading API',
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

  /**
   * Signature the payment provider sends: `sha256(JSON.stringify(payload) + secret)`
   * hex-encoded. This is a keyed hash, not HMAC, so it authenticates the payload
   * only together with the shared secret header.
   */
  computeWebhookSignature(payload: PaymentWebhookPayload, secret: string): string {
    const data = JSON.stringify(payload);
    return createHash('sha256').update(`${data}${secret}`).digest('hex');
  }

  logWebhookNoBillId(payload: PaymentWebhookPayload): void {
    console.warn('[webhook] No billId', {
      externalId: payload.externalId,
      amount: payload.amount,
      status: payload.status,
      timestamp: payload.timestamp,
    });
  }
}
