import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BillModule } from './bill/bill.module';
import { PriceFluctuationModule } from './pricefluctuation/pricefluctuation.module';
import { QueueModule } from './queue/index';
import { RealtimeModule } from './realtime/realtime.module';
import { RedisModule } from './redis/redis.module';
import { UserModule } from './user/user.module';
import { WalletModule } from './wallet/wallet.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const postgresHost = configService.get<string>('POSTGRES_HOST');
        const usePostgres = postgresHost && postgresHost !== 'localhost';

        if (usePostgres) {
          return {
            type: 'postgres',
            host: configService.get<string>('POSTGRES_HOST', 'localhost'),
            port: Number(configService.get<string>('POSTGRES_PORT', '5432')),
            username: configService.get<string>('POSTGRES_USER', 'postgres'),
            password: configService.get<string>('POSTGRES_PASSWORD', 'postgres'),
            database: configService.get<string>('POSTGRES_DB', 'okbong'),
            synchronize: configService.get<string>('NODE_ENV', 'development') !== 'production',
            logging: false,
            autoLoadEntities: true,
          } as const;
        }

        // SQLite fallback for local development when Postgres is unavailable
        return {
          type: 'better-sqlite3',
          database: ':memory:',
          synchronize: true,
          logging: false,
          autoLoadEntities: true,
        } as const;
      },
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    UserModule,
    WalletModule,
    BillModule,
    PriceFluctuationModule,
    QueueModule,
    RedisModule,
    RealtimeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
