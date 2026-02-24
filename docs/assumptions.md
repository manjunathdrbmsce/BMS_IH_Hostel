# BMS Hostel Platform — Assumptions

This document tracks architectural and design assumptions made during development.
When a requirement is ambiguous, a reasonable enterprise-safe assumption is documented here.

## Phase 0/1 Assumptions

### Authentication

1. **Single identifier login**: Users can log in with email, mobile, or USN (University Seat Number). The system searches all three fields to find a match.
2. **Password policy**: Minimum 8 characters with at least one uppercase, one lowercase, one digit, and one special character.
3. **JWT HS256**: Using HMAC-SHA256 for JWTs in Phase 0/1 for simplicity. Phase-ready for RS256 asymmetric keys if needed for microservice token verification.
4. **Token lifetimes**: Access tokens expire in 15 minutes. Refresh tokens expire in 7 days. These are configurable via environment variables.
5. **Refresh token rotation**: Every token refresh invalidates the old token and issues a new pair. If a revoked token is reused, all tokens for that user are revoked (compromised token protection).
6. **Session tracking**: Refresh tokens store device info and IP address. Full multi-device session management UI deferred to Phase 2.
7. **MFA**: Architecture is MFA-ready but actual TOTP/OTP implementation is deferred to Phase 2.

### Authorization (RBAC)

8. **Flat RBAC with permissions**: Roles are not hierarchical in Phase 1. Each role has explicit permission assignments. Role hierarchy can be added later.
9. **Scoped roles**: The `UserRole` table supports `hostelId` for hostel-scoped roles. In Phase 1, all roles are global (hostelId = null for the super admin).
10. **Permission check model**: RolesGuard uses OR logic (user needs any one of the listed roles). PermissionsGuard uses AND logic (user needs all listed permissions).
11. **System roles**: The 11 predefined roles are marked as `isSystem: true` and cannot be deleted via API.

### Users

12. **Soft delete**: Users are not physically deleted. They are set to `INACTIVE` status. This preserves audit trails and referential integrity.
13. **Email normalization**: Emails are lowercased and trimmed on creation.
14. **Unique constraints**: Email, mobile, and USN are individually unique (where not null).

### Audit

15. **Synchronous audit in Phase 1**: Audit logs are written directly to the database. In Phase 2+, this will be moved to an async queue (BullMQ) for performance.
16. **Sensitive data redaction**: Passwords and tokens are automatically redacted in audit log details.
17. **Fire-and-forget**: Audit log write failures are logged but do not cause the main request to fail.

### Database

18. **UUID primary keys**: All tables use UUID v4 primary keys for security (non-guessable) and distributed compatibility.
19. **Timestamps**: All tables have `created_at`. Mutable tables have `updated_at`.
20. **PostgreSQL 16**: Using the latest stable PostgreSQL with Alpine Docker image.

### Infrastructure

21. **Local development**: Docker Compose provides Postgres and Redis. Application runs natively on Node.js.
22. **No Redis usage in Phase 1**: Redis is provisioned but not actively used until BullMQ queues are implemented in Phase 2.
23. **Single timezone**: Server times are UTC. Client-side timezone conversion is expected.

### Frontend

24. **Minimal UI in Phase 1**: The web app has a login page and dashboard placeholder. Full admin console starts in Phase 2.
25. **Client-side token storage**: Tokens stored in localStorage for Phase 1. Migration to httpOnly cookies or secure storage planned for hardening phase.
26. **Mobile app**: Expo shell with login screen. Full role-based navigation in Phase 2+.

### General

27. **Indian context**: The platform is designed for Indian colleges/universities. Payment integration (Razorpay), mobile numbers (+91), and USN format are India-specific.
28. **Single institution**: Phase 1 assumes one institution. Multi-tenant support is architecture-ready but not implemented.
29. **English only**: No i18n in Phase 1. Internationalization can be added later.
30. **No file uploads in Phase 1**: S3-compatible storage abstraction is documented but not implemented until document upload features are built.
