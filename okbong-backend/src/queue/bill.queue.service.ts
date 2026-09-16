import { Injectable } from '@nestjs/common';
import { QueueModule } from './queue.module';

@Injectable()
export class BillQueueService {
  constructor(private readonly queue: QueueModule) {}

  async onBillCreated(payload: { billId: string; userId: string; type: string; content: string }) {
    return this.queue.addJob({ type: 'bill-created', payload });
  }
}
