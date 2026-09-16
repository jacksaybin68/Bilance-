import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { PaymentWebhookPayload } from './payment-webhook.controller';

@Injectable()
export class AppService {
  /**
   * Compute HMAC-SHA256 signature for webhook verification.
   * Same algorithm as the payment provider's signing method.
   */
  computeWebhookSignature(payload: PaymentWebhookPayload, secret: string): string {
    const data = JSON.stringify(payload);
    return createHash('sha256').update(`${data}${secret}`).digest('hex');
  }

  /**
   * Log webhook events that don't reference a bill (for manual reconciliation).
   */
  logWebhookNoBillId(payload: PaymentWebhookPayload): void {
    // In production, write to audit log / queue for reconciliation job.
    console.warn('[webhook] No billId', {
      externalId: payload.externalId,
      amount: payload.amount,
      status: payload.status,
      timestamp: payload.timestamp,
    });
  }
}
