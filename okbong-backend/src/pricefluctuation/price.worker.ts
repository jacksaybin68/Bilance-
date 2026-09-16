import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueueService } from '../queue/queue.service';
import { PriceFluctuationService } from './pricefluctuation.service';

/**
 * Tên các job mà PriceWorker xử lý.
 */
export const PRICE_FETCH_JOB = 'price:fetch';
export const PRICE_RECORD_JOB = 'price:record';

export interface PriceFetchPayload {
  symbol: string;
}

export interface PriceRecordPayload {
  symbol: string;
  price: number;
  volume?: number;
}

/**
 * PriceWorker — Background worker chuyên xử lý các job liên quan đến giá.
 *
 * Luồng hoạt động:
 *   1. Producer (e.g. external webhook, scheduler) gọi `enqueueFetch(symbol)`
 *   2. QueueService (BullMQ hoặc in-memory) enqueue job `price:fetch`
 *   3. PriceWorker nhận job → gọi PriceFluctuationService.getCurrentPrice()
 *   4. Sau khi lấy được giá, enqueue tiếp job `price:record` với giá trị mới
 *   5. Handler `price:record` gọi PriceFluctuationService.recordPrice()
 *      → tự động broadcast qua WebSocket (PriceGateway.broadcastPrice)
 *
 * Lợi ích:
 *   - Tách logic I/O nặng ra khỏi request thread (non-blocking)
 *   - Retry tự động khi Redis/BullMQ được bật
 *   - Dễ scale horizontal khi dùng nhiều instance
 */
@Injectable()
export class PriceWorker implements OnModuleInit {
  private readonly logger = new Logger(PriceWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly priceService: PriceFluctuationService,
  ) {}

  onModuleInit(): void {
    this.registerHandlers();
    this.logger.log('PriceWorker handlers registered');
  }

  // ─── Handler Registration ──────────────────────────────────────────────────

  private registerHandlers(): void {
    /**
     * Handler: price:fetch
     * Lấy giá hiện tại từ service (hoặc có thể mở rộng để call external API).
     * Sau đó enqueue job price:record để lưu & broadcast.
     */
    this.queueService.register(PRICE_FETCH_JOB, async (payload) => {
      const { symbol } = payload as unknown as PriceFetchPayload;

      if (!symbol) {
        this.logger.warn('[price:fetch] Missing symbol, skipping');
        return;
      }

      try {
        const current = await this.priceService.getCurrentPrice(symbol);
        this.logger.debug(`[price:fetch] symbol=${symbol} price=${current.price}`);

        // Enqueue record job — có thể áp dụng giá từ external API ở đây
        await this.queueService.add(PRICE_RECORD_JOB, {
          symbol: current.symbol,
          price: current.price,
          volume: current.volume ?? undefined,
        } satisfies PriceRecordPayload as unknown as Record<string, unknown>);
      } catch (err) {
        this.logger.error(
          `[price:fetch] Failed for symbol=${symbol}: ${(err as Error).message}`,
        );
        throw err; // BullMQ sẽ retry nếu job throw
      }
    });

    /**
     * Handler: price:record
     * Ghi giá vào DB và broadcast qua WebSocket (thực hiện bởi recordPrice).
     */
    this.queueService.register(PRICE_RECORD_JOB, async (payload) => {
      const { symbol, price, volume } = payload as unknown as PriceRecordPayload;

      if (!symbol || price == null) {
        this.logger.warn('[price:record] Invalid payload, skipping');
        return;
      }

      try {
        const saved = await this.priceService.recordPrice({ symbol, price, volume });
        this.logger.debug(
          `[price:record] Saved & broadcast symbol=${saved.symbol} price=${saved.price}`,
        );
      } catch (err) {
        this.logger.error(
          `[price:record] Failed for symbol=${symbol}: ${(err as Error).message}`,
        );
        throw err;
      }
    });
  }

  // ─── Public Producer API ───────────────────────────────────────────────────

  /**
   * Enqueue job fetch giá cho một symbol.
   * Gọi từ controller, scheduler, hoặc external event handler.
   *
   * @example
   *   await this.priceWorker.enqueueFetch('BDSD');
   */
  async enqueueFetch(symbol: string): Promise<{ id: string }> {
    return this.queueService.add(PRICE_FETCH_JOB, {
      symbol,
    } satisfies PriceFetchPayload as unknown as Record<string, unknown>);
  }

  /**
   * Enqueue job ghi & broadcast giá trực tiếp (bypass fetch).
   * Dùng khi đã có giá từ external feed / websocket ngoài.
   *
   * @example
   *   await this.priceWorker.enqueueRecord({ symbol: 'BDSD', price: 26500, volume: 12000 });
   */
  async enqueueRecord(payload: PriceRecordPayload): Promise<{ id: string }> {
    return this.queueService.add(
      PRICE_RECORD_JOB,
      payload as unknown as Record<string, unknown>,
    );
  }
}
