import { Global, Module } from '@nestjs/common';
import { AppService } from './app.service';

@Global()
@Module({
  providers: [AppService],
  exports: [AppService],
})
export class AppGlobalModule {}
