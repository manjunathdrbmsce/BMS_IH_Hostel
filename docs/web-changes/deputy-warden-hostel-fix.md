# Deputy Warden Hostel Fix

## Summary

Fixed a role-access mismatch on the web Hostels page for the `DEPUTY_WARDEN` role.

## Issue

The web sidebar allowed `DEPUTY_WARDEN` users to open:

```text
/dashboard/hostels
```

The Hostels page then requested both:

```text
GET /hostels
GET /hostels/stats
```

The backend allowed `DEPUTY_WARDEN` for `GET /hostels`, but did not allow `DEPUTY_WARDEN` for `GET /hostels/stats`. Because the frontend loads both calls together, the stats permission failure caused the page to show:

```text
Failed to load hostels
```

## Fix

Added `DEPUTY_WARDEN` to the allowed roles for the hostel stats endpoint.

## Files Changed

- `apps/api/src/hostels/hostels.controller.ts`

## Updated Endpoint

```ts
@Get('stats')
@Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN')
```

## Expected Result

When logged in as `DEPUTY_WARDEN`, the Hostels page should now load hostel list data and hostel dashboard stats instead of showing a generic load failure.
