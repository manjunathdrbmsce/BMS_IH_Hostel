import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_KEY = 'audit_action';

/**
 * Decorator to mark an endpoint for automatic audit logging.
 * Used with AuditInterceptor.
 *
 * @example
 * @AuditAction('USER_CREATE', 'users')
 * @Post()
 * create() { ... }
 */
export const AuditAction = (action: string, resource: string) =>
  SetMetadata(AUDIT_ACTION_KEY, { action, resource });
