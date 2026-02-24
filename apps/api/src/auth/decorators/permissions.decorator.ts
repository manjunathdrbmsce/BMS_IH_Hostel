import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Restrict access to users with specific permissions.
 * All listed permissions are required (AND logic).
 * Use with JwtAuthGuard + PermissionsGuard.
 *
 * @example
 * @RequirePermissions('USER_CREATE', 'USER_READ')
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
