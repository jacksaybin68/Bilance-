import { Module, Global } from '@nestjs/common';
import { DeadLetterQueueService } from './dead-letter-queue.service';

@Global()
@Module({
  providers: [DeadLetterQueueService],
  exports: [DeadLetterQueueService],
})
export class DeadLetterQueueModule {}
