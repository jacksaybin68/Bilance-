import { Global, Module } from '@nestjs/common';
import { PriceGateway } from './realtime.gateway';

@Global()
@Module({
  providers: [PriceGateway],
  exports: [PriceGateway],
})
export class RealtimeModule {}
