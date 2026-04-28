# Profile Menu Return Routing Fix - 2026-04-28

## Problem

From the mobile Profile screen, opening Profile menu options such as **Notifications**, **Help & Support**, or **Terms & Conditions** did not return the user to Profile when the back arrow was pressed.

Instead, the app could return to the role's main dashboard or home screen:

| Role | Incorrect return screen |
| --- | --- |
| Student | `/(student)/home` |
| Warden | `/(warden)/dashboard` |

That felt wrong because the user started from Profile, so the expected flow is:

```text
Profile -> Notifications/Help/Terms -> Profile
```

not:

```text
Profile -> Notifications/Help/Terms -> Dashboard/Home
```

## Root Cause

The affected screens are hidden tab screens in Expo Router.

For example:

```tsx
<Tabs.Screen name="notifications" options={{ href: null }} />
<Tabs.Screen name="profile" options={{ href: null }} />
```

Hidden tab screens are accessible with `router.push(...)`, but they are still part of the tab navigator. In this app, returning with a generic:

```ts
router.back()
```

could fall back to the active/default tab instead of the Profile screen that launched the flow.

There was also a second issue: **Help & Support** and **Terms & Conditions** were not real destinations yet.

Student Profile had empty handlers:

```ts
onPress: () => {}
```

Warden Profile had `null` routes:

```ts
route: null
```

So those rows either did nothing or could not participate in a correct navigation flow.

## Fix Summary

Profile-origin navigation now carries a small route parameter:

```ts
params: { returnTo: 'profile' }
```

Destination screens read that parameter. If the screen was opened from Profile, the back button explicitly returns to the role's Profile route:

```ts
router.replace('/(student)/profile')
router.replace('/(warden)/profile')
```

If the same destination screen was opened from somewhere else, such as Home, Dashboard, or More, it still uses normal back navigation:

```ts
router.back()
```

This keeps existing non-profile notification shortcuts working as before while fixing the Profile menu flow.

## Files Changed

### `apps/mobile/app/(student)/profile/index.tsx`

- Updated **Notifications** to open `/(student)/notifications` with:
  - `returnTo: 'profile'`
- Wired **Help & Support** to the new route:
  - `/(student)/help-support`
- Wired **Terms & Conditions** to the new route:
  - `/(student)/terms`
- Renamed the student terms row from **Terms of Service** to **Terms & Conditions** for consistency with the warden profile screen.

### `apps/mobile/app/(student)/notifications.tsx`

- Added `useLocalSearchParams`.
- Added a `handleBack()` helper.
- If `returnTo === 'profile'`, the header back button now returns to:

```text
/(student)/profile
```

- Otherwise, it continues to call `router.back()`.

### `apps/mobile/app/(student)/_layout.tsx`

- Registered the new hidden student routes:

```tsx
<Tabs.Screen name="help-support" options={{ href: null }} />
<Tabs.Screen name="terms" options={{ href: null }} />
```

These routes are accessible through navigation but do not appear in the bottom tab bar.

### `apps/mobile/app/(student)/help-support.tsx`

- Added a student Help & Support screen.
- Uses the shared Profile info page component.
- Back navigation returns to student Profile when opened from Profile.

### `apps/mobile/app/(student)/terms.tsx`

- Added a student Terms & Conditions screen.
- Uses the shared Profile info page component.
- Back navigation returns to student Profile when opened from Profile.

### `apps/mobile/app/(warden)/profile.tsx`

- Updated **Notifications** to open `/(warden)/notifications` with:
  - `returnTo: 'profile'`
- Wired **Help & Support** to the new route:
  - `/(warden)/help-support`
- Wired **Terms & Conditions** to the new route:
  - `/(warden)/terms`

### `apps/mobile/app/(warden)/notifications.tsx`

- Added `useLocalSearchParams`.
- Added a `handleBack()` helper.
- If `returnTo === 'profile'`, the header back button now returns to:

```text
/(warden)/profile
```

- Otherwise, it continues to call `router.back()`.

### `apps/mobile/app/(warden)/_layout.tsx`

- Registered the new hidden warden routes:

```tsx
<Tabs.Screen name="help-support" options={{ href: null }} />
<Tabs.Screen name="terms" options={{ href: null }} />
```

### `apps/mobile/app/(warden)/help-support.tsx`

- Added a warden Help & Support screen.
- Uses the shared Profile info page component.
- Back navigation returns to warden Profile when opened from Profile.

### `apps/mobile/app/(warden)/terms.tsx`

- Added a warden Terms & Conditions screen.
- Uses the shared Profile info page component.
- Back navigation returns to warden Profile when opened from Profile.

### `apps/mobile/src/components/ProfileInfoPage.tsx`

- Added a shared reusable screen component for simple Profile-related information pages.
- Handles:
  - themed header
  - safe-area spacing
  - back navigation
  - title and icon display
  - reusable content sections
- Accepts a role-specific `profileRoute`, so student and warden screens can share the same implementation while returning to the correct Profile route.

## Expected Navigation Behavior

### Student

| Start | Tap | Back returns to |
| --- | --- | --- |
| Student Profile | Notifications | Student Profile |
| Student Profile | Help & Support | Student Profile |
| Student Profile | Terms & Conditions | Student Profile |
| Student Home or More | Notifications | Previous screen/default previous behavior |

### Warden

| Start | Tap | Back returns to |
| --- | --- | --- |
| Warden Profile | Notifications | Warden Profile |
| Warden Profile | Help & Support | Warden Profile |
| Warden Profile | Terms & Conditions | Warden Profile |
| Warden Dashboard or More | Notifications | Previous screen/default previous behavior |

## Design Note

The fix intentionally does not make Notifications always return to Profile.

Notifications can be opened from multiple places:

- Student Home
- Student More
- Student Profile
- Warden Dashboard
- Warden More
- Warden Profile

Only the Profile-launched path should force a Profile return. That is why the change uses an explicit `returnTo=profile` parameter instead of changing the Notifications screen to always go back to Profile.

## Verification

Mobile TypeScript check passed:

```powershell
cd C:\BMS_IH_Hostel\apps\mobile
npm.cmd run typecheck
```

The first attempt with `npm run typecheck` was blocked by the local PowerShell execution policy because `npm.ps1` scripts are disabled. Running the same script through `npm.cmd` succeeded.

## Revert Notes

To revert this change manually:

1. Remove the `returnTo: 'profile'` params from the student and warden Profile menu navigation.
2. Change the Notifications back buttons back to direct `router.back()` calls.
3. Remove the hidden `help-support` and `terms` tab registrations from the student and warden layouts.
4. Delete the newly added Help & Support and Terms screen files.
5. Delete `apps/mobile/src/components/ProfileInfoPage.tsx` if no other screens use it.

Note: reverting only the Notifications changes will bring back the dashboard/home return issue for Profile-launched notification navigation.
