import { Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { BillQueueService } from './bill.queue.service';

export interface AppQueue {
  addJob(data: { type: string; payload: Record<string, unknown> }): Promise<{ id: string }>;
}

@Module({
  providers: [QueueService, BillQueueService],
  exports: [QueueService, BillQueueService],
})
export class QueueModule {}
