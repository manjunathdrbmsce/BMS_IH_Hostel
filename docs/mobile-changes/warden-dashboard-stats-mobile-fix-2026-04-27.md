# Warden Dashboard Stats Mobile Fix - 2026-04-27

## Problem

The mobile warden dashboard showed `0` for its stats even when the API returned data.

## Root Cause

The mobile app expected a flat dashboard response:

```ts
{
  totalStudents: number;
  presentToday: number;
  pendingLeaves: number;
  openComplaints: number;
}
```

But the backend `GET /dashboard/stats` response is nested for the web dashboard:

```ts
{
  users: { students: number },
  hostels: { occupiedBeds: number },
  leave: { pending: number },
  complaints: { open: number }
}
```

Because the mobile screen read fields that did not exist, each value fell back to `0`.

## Files Changed

### `apps/mobile/src/api/students.api.ts`

- Updated the `DashboardStats` interface to match the nested backend response sections used by mobile:
  - `users`
  - `hostels`
  - `leave`
  - `complaints`
- Kept the old flat fields as optional compatibility fields because other mobile screens still import the same shared `DashboardStats` type.

### `apps/mobile/app/(warden)/dashboard.tsx`

- Updated stat cards to read nested backend fields:
  - `stats.users.students`
  - `stats.hostels.occupiedBeds`
  - `stats.leave.pending`
  - `stats.complaints.open`
- Replaced the unavailable `Present Today` card with `Occupied Beds` because `/dashboard/stats` does not return `presentToday`.

## Revert Notes

To revert this change manually:

1. Restore the old flat `DashboardStats` interface in `apps/mobile/src/api/students.api.ts`.
2. Restore the old flat stat reads in `apps/mobile/app/(warden)/dashboard.tsx`.
3. Restore the second card title from `Occupied Beds` back to `Present Today` if needed.

Note: reverting only the mobile files will bring back the old behavior unless the backend also starts returning the old flat fields.
