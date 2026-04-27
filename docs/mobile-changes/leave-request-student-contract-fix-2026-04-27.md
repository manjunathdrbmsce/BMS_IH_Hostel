# Leave Request Student Contract Fix - 2026-04-27

## Problem

The leave request approve/reject actions worked, but the mobile UI did not show the student's details on leave request screens.

The warden leave detail screen could also keep showing the warden decision as pending even after the warden approved or rejected the request.

## Root Cause

This was an API contract mismatch between the backend and the mobile app.

The backend returns the leave request student as a flat user object:

```ts
student: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  usn: string | null;
}
```

So the correct mobile access path is:

```ts
leave.student?.firstName
leave.student?.lastName
leave.student?.usn
```

But the mobile `LeaveRequest` type incorrectly described the student as nested under `user`:

```ts
student?: {
  user: {
    firstName: string;
    lastName: string;
    usn: string | null;
  };
}
```

That made the UI read:

```ts
leave.student?.user?.firstName
```

`student.user` does not exist in the backend response, so the name and USN rendered blank even though the API had sent the data.

There was a second field-name mismatch for approval dates. The backend returns:

```ts
parentApprovalAt
wardenApprovalAt
rejectedAt
```

The mobile type and screens were reading:

```ts
parentApprovedAt
wardenApprovedAt
```

Because those fields did not exist, the approval timeline could still display `Pending`.

## Files Changed

### `apps/mobile/src/api/leave.api.ts`

- Updated `LeaveRequest.student` to match the backend's flat student response.
- Replaced `parentApprovedAt` with `parentApprovalAt`.
- Replaced `wardenApprovedAt` with `wardenApprovalAt`.
- Added `rejectedAt` so rejected warden decisions can show a timestamp.

### `apps/mobile/app/(warden)/leave/index.tsx`

- Updated the warden leave list to read:
  - `item.student?.firstName`
  - `item.student?.lastName`
- Removed the unused `formatRelative` import.

### `apps/mobile/app/(warden)/leave/[id].tsx`

- Updated the student card to read:
  - `leave.student?.firstName`
  - `leave.student?.lastName`
  - `leave.student?.usn`
- Updated the timeline to read:
  - `leave.parentApprovalAt`
  - `leave.wardenApprovalAt`
  - `leave.rejectedAt`
- The warden decision row now uses `wardenApprovalAt ?? rejectedAt`, so both approvals and rejections can show a decision time.

### `apps/mobile/app/(parent)/leave/[id].tsx`

- Updated the parent leave detail screen to use the same flat student shape:
  - `leave.student?.firstName`
  - `leave.student?.lastName`
  - `leave.student?.usn`

### `apps/mobile/app/(student)/leave/[id].tsx`

- Updated the student timeline field names:
  - `parentApprovalAt`
  - `wardenApprovalAt`

### `apps/api/src/leave/leave.service.ts`

- No code change.
- This file already returns the canonical backend response shape:
  - flat `student`
  - `parentApprovalAt`
  - `wardenApprovalAt`
  - `rejectedAt`

### `apps/web/src/app/docs/mobile/page.tsx`

- Added a `Leave Request API Contract` section to the mobile documentation page.
- Documented the correct response shape, the incorrect access pattern, and the affected files.

## Production Design Note

In a production system, the API response shape is a contract. The backend, mobile app, and documentation must agree on that contract.

If the backend returns:

```ts
student.firstName
```

the mobile app should not read:

```ts
student.user.firstName
```

TypeScript types should describe the real API response, not the shape the frontend wishes existed. Otherwise the code can compile but still show empty data at runtime.

## Verification

Mobile TypeScript check passed:

```powershell
pnpm.cmd --filter mobile typecheck
```

The web docs build was not verified. `pnpm.cmd --filter web build` failed in the sandbox with `spawn EPERM`, and the outside-sandbox retry was not approved.

## Revert Notes

To revert this change manually:

1. Change `LeaveRequest.student` in `apps/mobile/src/api/leave.api.ts` back to the nested `student.user` shape.
2. Restore `parentApprovedAt` and `wardenApprovedAt` in the mobile type and leave screens.
3. Restore all UI reads from `student.firstName` back to `student.user.firstName`.

Note: reverting only the mobile files will bring back the blank student details unless the backend is also changed to return the nested `student.user` shape.
