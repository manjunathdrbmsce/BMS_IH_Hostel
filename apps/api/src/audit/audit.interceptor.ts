import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { AuditService } from './audit.service';
import { AUDIT_ACTION_KEY } from './audit.decorator';
import { Request } from 'express';

/**
 * Interceptor that automatically creates audit log entries
 * for endpoints decorated with @AuditAction().
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const auditMeta = this.reflector.get<{ action: string; resource: string } | undefined>(
      AUDIT_ACTION_KEY,
      context.getHandler(),
    );

    if (!auditMeta) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as { id: string } | undefined;
    const ipAddress =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      request.ip ||
      null;
    const userAgent = (request.headers['user-agent'] as string) || null;

    return next.handle().pipe(
      tap({
        next: () => {
          this.auditService
            .log({
              userId: user?.id ?? null,
              action: auditMeta.action,
              resource: auditMeta.resource,
              resourceId: (request.params?.id as string) ?? null,
              details: this.sanitizeBody(request.body),
              ipAddress,
              userAgent,
            })
            .catch((err) => {
              this.logger.error(`Audit log failed: ${err.message}`);
            });
        },
        error: () => {
          // Optionally log failed actions too
        },
      }),
    );
  }

  /**
   * Remove sensitive fields from audit details.
   */
  private sanitizeBody(body: Record<string, unknown> | undefined): Record<string, unknown> | null {
    if (!body || typeof body !== 'object') return null;

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'passwordHash', 'refreshToken', 'token', 'secret'];
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }
    return sanitized;
  }
}
