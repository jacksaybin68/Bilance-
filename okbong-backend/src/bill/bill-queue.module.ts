import { Module, forwardRef } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module';
import { QueueService } from '../queue/queue.service';

@Module({
  imports: [forwardRef(() => QueueModule)],
  providers: [QueueService],
  exports: [QueueService],
})
export class BillQueueModule {}
