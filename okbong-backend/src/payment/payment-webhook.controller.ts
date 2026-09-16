import { Controller, Post, Body, Headers, HttpCode, HttpStatus, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillEntity } from '../bill/entity/bill.entity';
import { BillStatus } from '../bill/dto/bill.dto';
import { AppService } from '../app.service';

export interface PaymentWebhookPayload {
  /**
   * Identifier of the payment in the external payment provider.
   */
  externalId: string;
  /**
   * NexTrading internal bill UUID to reconcile against.
   */
  billId?: string;
  /**
   * Amount charged (should match bill amount).
   */
  amount: number;
  /**
   * Status from the external payment provider.
   */
  status: 'success' | 'failed' | 'pending' | 'refund' | 'chargeback' | 'paid';
  /**
   * ISO-8601 timestamp of the event.
   */
  timestamp: string;
  /**
   * Optional signature for verification (hmac, jwt, etc).
   */
  signature?: string;
  [key: string]: unknown;
}

@ApiTags('payment-webhook')
@ApiBearerAuth()
@Controller('payment-webhook')
export class PaymentWebhookController {
  constructor(
    @InjectRepository(BillEntity)
    private readonly billRepository: Repository<BillEntity>,
    private readonly configService: ConfigService,
    private readonly appService: AppService,
  ) {}

  /**
   * Webhook endpoint for external payment providers.
   *
   * Security: rely on a shared secret (X-Webhook-Secret header) + optional
   * signature verification. In production, also verify TLS and IP allowlist.
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive payment webhook from external provider' })
  @ApiOkResponse({ description: 'Webhook processed' })
  async handleWebhook(
    @Body() payload: PaymentWebhookPayload,
    @Headers('x-webhook-secret') secret: string | undefined,
    @Headers('x-webhook-signature') signature: string | undefined,
  ): Promise<{ received: true; processed: string; billId?: string }> {
    if (!secret || secret !== this.configService.get('WEBHOOK_SECRET')) {
      throw new UnauthorizedException('Invalid webhook secret');
    }

    // Optionally verify signature (payload + secret)
    if (signature) {
      const expected = this.appService.computeWebhookSignature(payload, secret);
      if (signature !== expected) {
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    if (payload.status === 'success' || payload.status === 'paid') {
      if (payload.billId) {
        const bill = await this.billRepository.findOneBy({ id: payload.billId });
        if (!bill) {
          throw new BadRequestException(`Bill ${payload.billId} not found`);
        }
        if (bill.status === BillStatus.PAID) {
          return { received: true, processed: 'already-paid' };
        }
        bill.status = BillStatus.PAID;
        await this.billRepository.save(bill);
      } else {
        // No billId — log for manual reconciliation
        this.appService.logWebhookNoBillId(payload);
      }
    }

    if (payload.status === 'refund' || payload.status === 'chargeback') {
      if (payload.billId) {
        const bill = await this.billRepository.findOneBy({ id: payload.billId });
        if (bill) {
          bill.status = BillStatus.CANCELLED;
          await this.billRepository.save(bill);
        }
      }
    }

    return { received: true, processed: payload.status };
  }
}
