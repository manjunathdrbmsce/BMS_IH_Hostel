import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Restrict access to users with specific roles.
 * Use with JwtAuthGuard + RolesGuard.
 *
 * @example
 * @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
