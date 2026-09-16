import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const port = 3000;
  await app.listen(port);
  logger.log(`OKBong backend listening on port ${port}`);
  // keep alive signal
  setInterval(() => {}, 60000);
}

bootstrap();
