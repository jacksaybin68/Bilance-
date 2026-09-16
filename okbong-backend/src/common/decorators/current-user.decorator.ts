import { ExecutionContext, UnauthorizedException, createParamDecorator } from '@nestjs/common';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

/** Injects the authenticated user resolved by JwtStrategy. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();

    if (!request.user) {
      throw new UnauthorizedException('Authentication required');
    }

    return request.user;
  },
);
