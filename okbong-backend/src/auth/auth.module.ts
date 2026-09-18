import { Global, Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { requireSecret } from '../common/utils/require-secret.util';
import { UserModule } from '../user/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';
import { JwtStrategy } from './jwt.strategy';
import { LocalStrategy } from './local.strategy';
import { OTPSessionService } from './otp-session.service';
import { TwoFactorService } from './two-factor.service';

@Global()
@Module({
  imports: [
    forwardRef(() => UserModule),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: requireSecret(configService, 'JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRES', '1h') as
            | number
            | `${number}`
            | `${number} ${'s' | 'm' | 'h' | 'd' | 'w'}`,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy, JwtRefreshStrategy, TwoFactorService, OTPSessionService],
  exports: [AuthService, JwtModule, TwoFactorService, OTPSessionService, PassportModule],
})
export class AuthModule {}
