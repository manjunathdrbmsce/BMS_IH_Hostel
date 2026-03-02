/**
 * Safely check if a user object has a specific role.
 * Replaces the fragile `user.roles?.includes(role)` pattern.
 *
 * Works with both flat string arrays and `{ name: string }` arrays,
 * so it's safe regardless of how the JWT payload or Prisma query returns roles.
 */
export function hasRole(
    user: { roles?: (string | { name: string })[] } | null | undefined,
    ...roleNames: string[]
): boolean {
    if (!user?.roles || !Array.isArray(user.roles) || user.roles.length === 0) {
        return false;
    }

    const userRoles = user.roles.map((r) =>
        typeof r === 'string' ? r : r.name,
    );

    return roleNames.some((role) => userRoles.includes(role));
}

/**
 * Check if user has ANY of the specified roles.
 */
export function hasAnyRole(
    user: { roles?: (string | { name: string })[] } | null | undefined,
    roleNames: string[],
): boolean {
    return hasRole(user, ...roleNames);
}
