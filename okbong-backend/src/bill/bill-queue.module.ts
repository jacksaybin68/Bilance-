import { Module } from '@nestjs/common';
import { QueueModule } from '../queue/index';

/**
 * Convenience wrapper: re-exports the shared queue providers (QueueService,
 * BillQueueService) so a consumer only needs to import this one module.
 */
@Module({
  imports: [QueueModule],
  exports: [QueueModule],
})
export class BillQueueModule {}