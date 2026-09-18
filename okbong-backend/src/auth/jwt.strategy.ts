import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { requireSecret } from '../common/utils/require-secret.util';
import { Role } from '../enumeration/role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: requireSecret(configService, 'JWT_SECRET'),
    });
  }

  validate(payload: { sub: string; email: string; role: string }): AuthenticatedUser {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role as Role,
    };
  }
}
