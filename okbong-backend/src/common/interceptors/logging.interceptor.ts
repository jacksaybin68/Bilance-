import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

/**
 * Logs method, url, status and duration. It never rewrites the response body,
 * so the public API contract stays exactly the same.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const startedAt = Date.now();
    const request = context.switchToHttp().getRequest<{ method: string; url: string }>();
    const response = context.switchToHttp().getResponse<{ statusCode: number }>();

    return next.handle().pipe(
      tap({
        next: () =>
          this.logger.log(
            `${request.method} ${request.url} ${response.statusCode} - ${Date.now() - startedAt}ms`,
          ),
        error: (error: unknown) =>
          this.logger.warn(
            `${request.method} ${request.url} failed after ${Date.now() - startedAt}ms: ${
              error instanceof Error ? error.message : String(error)
            }`,
          ),
      }),
    );
  }
}
