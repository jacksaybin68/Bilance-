import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { requireSecret } from '../common/utils/require-secret.util';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { UserJwtPayload } from '../user/entity/user.entity';

function extractRefreshToken(req: Request): string | null {
  const fromHeader = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  if (fromHeader) return fromHeader;

  const body = req.body as { refreshToken?: unknown } | undefined;
  return typeof body?.refreshToken === 'string' && body.refreshToken.length > 0
    ? body.refreshToken
    : null;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: extractRefreshToken,
      ignoreExpiration: false,
      secretOrKey: requireSecret(configService, 'JWT_REFRESH_SECRET'),
    });
  }

  validate(payload: UserJwtPayload): AuthenticatedUser {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
