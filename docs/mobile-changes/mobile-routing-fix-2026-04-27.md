# Mobile Routing Fix - 2026-04-27

## Problem

The mobile app opened to Expo Router's **Unmatched Route** screen instead of the login screen or the correct role dashboard.

## Root Cause

The app startup logic redirected every authenticated user to:

```text
/<role-group>/home
```

That path works for student and parent users, but it does not work for admin/warden users because the warden route group does not have a `home` screen. Its first screen is:

```text
/(warden)/dashboard
```

So a saved admin session was redirected to:

```text
/(warden)/home
```

That route does not exist, which caused the unmatched route screen.

## Files Changed

### `apps/mobile/app/_layout.tsx`

- Added a `getDefaultRoute(group)` helper.
- Updated authenticated startup redirects to use role-specific default screens.
- Registered the root `index` route in the root `Stack`.

### `apps/mobile/app/index.tsx`

- Added the same `getDefaultRoute(group)` helper.
- Updated the root index redirect to send authenticated users to a real route for their role.

## New Default Routes

| Role group | Startup route |
| --- | --- |
| Logged out | `/(auth)/login` |
| Student | `/(student)/home` |
| Parent | `/(parent)/home` |
| Warden/Admin | `/(warden)/dashboard` |
| Security | `/(security)/gate` |

## Verification

TypeScript check passed:

```powershell
pnpm.cmd --filter mobile exec tsc --noEmit
```

## How To Run After This Change

Because this was a JavaScript/TypeScript routing change, no native rebuild is required.

Run Metro with cache cleared:

```powershell
cd C:\BMS_IH_Hostel\apps\mobile
npx expo start --clear --android
```

If the app still opens into a dashboard instead of login, the emulator has a saved token. Clear the app data or log out to force the login screen.
