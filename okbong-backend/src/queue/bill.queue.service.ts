import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueueService } from './queue.service';

export const BILL_CREATED_JOB = 'bill-created';

export interface BillCreatedPayload {
  billId: string;
  userId: string;
  type: string;
  amount?: number;
  description?: string | null;
  content?: string;
  [key: string]: unknown;
}

@Injectable()
export class BillQueueService implements OnModuleInit {
  private readonly logger = new Logger(BillQueueService.name);

  constructor(private readonly queueService: QueueService) {}

  onModuleInit(): void {
    this.queueService.register(BILL_CREATED_JOB, async (payload) => {
      const { billId, userId, type } = payload as unknown as BillCreatedPayload;
      this.logger.log(
        `[queue] bill-created job -> bill=${billId} user=${userId} type=${type}`,
      );
      // Hook point for future side effects (notifications, wallet settlement, etc.)
    });
  }

  async onBillCreated(payload: BillCreatedPayload): Promise<{ id: string }> {
    return this.queueService.add(BILL_CREATED_JOB, payload as unknown as Record<string, unknown>);
  }
}