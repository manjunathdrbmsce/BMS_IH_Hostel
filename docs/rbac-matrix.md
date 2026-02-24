# BMS Hostel Platform — RBAC Matrix

## Roles

| # | Role | Scope | Description |
|---|------|-------|-------------|
| 1 | SUPER_ADMIN | Global | Full system access across all hostels |
| 2 | HOSTEL_ADMIN | Global/Hostel | Hostel-level administrative access |
| 3 | WARDEN | Hostel | Student welfare, approvals, operations |
| 4 | DEPUTY_WARDEN | Hostel | Warden assistant, covers leave/gate/complaints |
| 5 | ACCOUNTS_OFFICER | Global | Finance, fees, payments, reports |
| 6 | MESS_MANAGER | Hostel | Mess operations, menus, reports |
| 7 | MESS_STAFF | Hostel | Counter scanning only |
| 8 | SECURITY_GUARD | Hostel | Gate operations, visitor management |
| 9 | MAINTENANCE_STAFF | Hostel | Complaint resolution |
| 10 | STUDENT | Hostel | Self-service student operations |
| 11 | PARENT | — | View child status, approve leave |

## Permission Matrix

| Permission | Super Admin | Hostel Admin | Warden | Deputy Warden | Accounts | Mess Mgr | Mess Staff | Security | Maintenance | Student | Parent |
|------------|:-----------:|:------------:|:------:|:-------------:|:--------:|:--------:|:----------:|:--------:|:-----------:|:-------:|:------:|
| **Users** | | | | | | | | | | | |
| USER_CREATE | ✅ | ✅ | | | | | | | | | |
| USER_READ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | | ✅ | | | |
| USER_UPDATE | ✅ | ✅ | | | | | | | | | |
| USER_DELETE | ✅ | | | | | | | | | | |
| USER_LIST | ✅ | ✅ | ✅ | ✅ | ✅ | | | | | | |
| **Roles** | | | | | | | | | | | |
| ROLE_ASSIGN | ✅ | ✅ | | | | | | | | | |
| ROLE_REVOKE | ✅ | ✅ | | | | | | | | | |
| **Hostel** | | | | | | | | | | | |
| HOSTEL_MANAGE | ✅ | ✅ | | | | | | | | | |
| ROOM_MANAGE | ✅ | ✅ | ✅ | | | | | | | | |
| ALLOTMENT_MANAGE | ✅ | ✅ | ✅ | | | | | | | | |
| **Finance** | | | | | | | | | | | |
| FINANCE_MANAGE | ✅ | ✅ | | | ✅ | | | | | | |
| PAYMENT_VIEW | ✅ | ✅ | ✅ | | ✅ | | | | | ✅ | ✅ |
| **Gate** | | | | | | | | | | | |
| GATE_OPERATE | ✅ | | ✅ | ✅ | | | | ✅ | | | |
| LEAVE_APPROVE | ✅ | ✅ | ✅ | ✅ | | | | | | | |
| **Mess** | | | | | | | | | | | |
| MESS_MANAGE | ✅ | ✅ | | | | ✅ | | | | | |
| MESS_SCAN | ✅ | | | | | ✅ | ✅ | | | | |
| **Operations** | | | | | | | | | | | |
| COMPLAINT_MANAGE | ✅ | ✅ | ✅ | ✅ | | | | | ✅ | | |
| NOTICE_PUBLISH | ✅ | ✅ | ✅ | ✅ | | | | | | | |
| REPORT_VIEW | ✅ | ✅ | ✅ | | ✅ | ✅ | | | | | |
| AUDIT_VIEW | ✅ | ✅ | | | | | | | | | |

## Access Control Implementation

### Guards

1. **JwtAuthGuard** — Verifies JWT access token, attaches user to request
2. **RolesGuard** — Checks if user has at least one of the required roles (OR logic)
3. **PermissionsGuard** — Checks if user has all required permissions (AND logic)

### Decorators

```typescript
// Require specific roles (OR — any one matches)
@Roles('SUPER_ADMIN', 'HOSTEL_ADMIN')

// Require specific permissions (AND — all must match)
@RequirePermissions('USER_CREATE', 'USER_READ')

// Mark endpoint as public (no auth)
@Public()

// Extract current user
@CurrentUser() user
@CurrentUser('id') userId
```

### Usage Pattern

```typescript
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class UsersController {

  @Post()
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN')
  create(@Body() dto: CreateUserDto) { ... }
}
```

## Scoped Roles

Roles can be scoped to a specific hostel via `UserRole.hostelId`:
- `hostelId = null` → Global role (e.g., SUPER_ADMIN)
- `hostelId = <uuid>` → Hostel-scoped role (e.g., WARDEN of Hostel A)

This enables multi-hostel deployments where wardens/staff are assigned per hostel.

## Role Hierarchy (future enhancement)

When needed, role inheritance can be implemented:
- SUPER_ADMIN inherits all permissions
- HOSTEL_ADMIN inherits from WARDEN
- WARDEN inherits from DEPUTY_WARDEN

Currently, permissions are explicitly assigned per role in the seed script.
