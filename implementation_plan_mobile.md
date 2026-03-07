# BMS Hostel — Studio-Grade Enterprise Mobile App Implementation Plan

> **Date:** 2026-03-03 | **Platform:** Expo SDK 52 + React Native 0.76 | **Target:** iOS + Android

## Background

The BMS Hostel backend is production-ready with **21 NestJS modules** and **110+ REST endpoints** covering auth, attendance, leave, gate, complaints, notices, violations, registration, and more. The mobile app is currently a **3-file placeholder shell** ([_layout.tsx](file:///D:/Apps/hostel/BMS_hostel/apps/mobile/app/_layout.tsx), [index.tsx](file:///D:/Apps/hostel/BMS_hostel/apps/mobile/app/index.tsx), [login.tsx](file:///D:/Apps/hostel/BMS_hostel/apps/mobile/app/login.tsx)) with only a basic login form. This plan transforms it into a studio-grade enterprise application.

### Target Users (RBAC Roles → Mobile Personas)

| Persona | Roles | Primary Use Cases |
|---|---|---|
| **Student** | `STUDENT` | Attendance QR scan, leave requests, gate passes, complaints, notices, violations history, profile |
| **Parent** | `PARENT` | Ward status, leave approval/rejection, attendance view, gate alerts, notices |
| **Warden / Staff** | `WARDEN`, `DEPUTY_WARDEN`, `HOSTEL_ADMIN` | Roll-call sessions, leave approvals, gate monitoring, device management, reports |
| **Security Guard** | `SECURITY_GUARD` | Gate entry/exit scanning, gate pass verification, quick log |

---

## User Review Required

> [!IMPORTANT]
> **Technology decisions requiring confirmation:**
> 1. **State management:** Plan uses Zustand (lightweight, Expo-friendly). Alternative: React Query + Context. Confirm preference.
> 2. **UI library:** Plan uses a custom design system with `react-native-reanimated` for animations. Alternative: NativeWind (Tailwind for RN), Tamagui, or Gluestack UI. Confirm preference.
> 3. **QR scanning:** Plan uses `expo-camera` with `expo-barcode-scanner`. Confirm if this is acceptable or if a different library is preferred.
> 4. **Push notifications:** Plan uses `expo-notifications` with FCM/APNs. This requires a backend push-notification endpoint (not yet implemented). Should we implement it as part of this plan?
> 5. **Biometric auth:** Plan includes fingerprint/Face ID via `expo-local-authentication`. Confirm if desired.
> 6. **Offline support:** Plan includes offline-first for key screens using MMKV storage. Confirm scope.

> [!WARNING]
> **The backend currently lacks these endpoints needed by certain mobile features:**
> - `POST /auth/forgot-password` — Password reset flow (schema exists, no endpoint)
> - Push notification registration endpoint — Needs new `POST /notifications/register-device`
> - Student self-profile view — May need `GET /students/profiles/me`
>
> These will be added as part of Phase 2 (minimal backend additions).

---

## Proposed Changes

### Architecture Overview

```
apps/mobile/
├── app/                          # Expo Router (file-based routing)
│   ├── _layout.tsx               # Root layout — auth check, theme provider
│   ├── (auth)/                   # Auth group (no tab bar)
│   │   ├── _layout.tsx
│   │   ├── welcome.tsx           # Onboarding / splash
│   │   ├── login.tsx             # Login screen
│   │   └── forgot-password.tsx   # Password reset
│   ├── (student)/                # Student tab navigator
│   │   ├── _layout.tsx           # Bottom tabs: Home, Attendance, Leave, More
│   │   ├── home.tsx              # Dashboard home
│   │   ├── attendance/
│   │   │   ├── index.tsx         # Attendance history calendar
│   │   │   ├── scan.tsx          # QR scanner
│   │   │   └── [id].tsx          # Session detail
│   │   ├── leave/
│   │   │   ├── index.tsx         # Leave list
│   │   │   ├── apply.tsx         # Apply for leave
│   │   │   └── [id].tsx          # Leave detail
│   │   ├── gate/
│   │   │   ├── index.tsx         # Gate pass list
│   │   │   └── request.tsx       # Request gate pass
│   │   ├── complaints/
│   │   │   ├── index.tsx         # Complaints list
│   │   │   └── create.tsx        # File complaint
│   │   ├── notices/
│   │   │   ├── index.tsx         # Notice feed
│   │   │   └── [id].tsx          # Notice detail
│   │   ├── violations/
│   │   │   └── index.tsx         # Violation history
│   │   ├── profile/
│   │   │   └── index.tsx         # Student profile + settings
│   │   └── notifications.tsx     # Notification center
│   ├── (parent)/                 # Parent tab navigator
│   │   ├── _layout.tsx           # Tabs: Home, Leave, History
│   │   ├── home.tsx              # Ward status dashboard
│   │   ├── leave/
│   │   │   ├── index.tsx         # Pending approvals
│   │   │   └── [id].tsx          # Leave detail + approve/reject
│   │   ├── attendance.tsx        # Ward attendance calendar
│   │   ├── notices.tsx           # Notices feed
│   │   └── profile.tsx           # Parent profile
│   ├── (warden)/                 # Warden tab navigator
│   │   ├── _layout.tsx           # Tabs: Dashboard, Roll-Call, Leave, More
│   │   ├── dashboard.tsx         # Live stats + presence board
│   │   ├── roll-call/
│   │   │   ├── index.tsx         # Active sessions
│   │   │   ├── create.tsx        # Start new session
│   │   │   └── [id].tsx          # Session live view + QR display
│   │   ├── leave/
│   │   │   ├── index.tsx         # Pending leave requests
│   │   │   └── [id].tsx          # Leave detail + approve/reject
│   │   ├── devices/
│   │   │   ├── index.tsx         # Device change requests
│   │   │   └── [id].tsx          # Request detail + approve/reject
│   │   ├── gate.tsx              # Gate activity log
│   │   └── students.tsx          # Student directory
│   └── (security)/               # Security guard tab navigator
│       ├── _layout.tsx           # Tabs: Gate, Passes, Log
│       ├── gate.tsx              # Gate entry scanner
│       ├── passes.tsx            # Gate pass verification
│       └── log.tsx               # Today's entry/exit log
├── src/
│   ├── api/                      # API layer
│   │   ├── client.ts             # Axios instance, interceptors, token refresh
│   │   ├── auth.api.ts           # Auth endpoints
│   │   ├── attendance.api.ts     # Attendance endpoints
│   │   ├── leave.api.ts          # Leave endpoints
│   │   ├── gate.api.ts           # Gate endpoints
│   │   ├── complaints.api.ts     # Complaints endpoints
│   │   ├── notices.api.ts        # Notices endpoints
│   │   ├── violations.api.ts     # Violations endpoints
│   │   ├── notifications.api.ts  # Notifications endpoints
│   │   └── students.api.ts       # Students endpoints
│   ├── store/                    # Zustand stores
│   │   ├── auth.store.ts         # Auth state, tokens, user profile
│   │   ├── notifications.store.ts
│   │   └── app.store.ts          # Theme, offline queue, app state
│   ├── hooks/                    # Custom hooks
│   │   ├── useAuth.ts            # Auth convenience hook
│   │   ├── useApi.ts             # API query hook with loading/error
│   │   ├── useLocation.ts        # GPS location hook
│   │   ├── useDeviceInfo.ts      # Device fingerprint hook
│   │   └── useBiometrics.ts      # Biometric auth hook
│   ├── components/               # Shared UI components
│   │   ├── ui/                   # Design system primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Avatar.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   ├── Toast.tsx
│   │   │   └── BottomSheet.tsx
│   │   ├── StatusBadge.tsx       # Leave/complaint status badges
│   │   ├── CalendarHeatmap.tsx   # Attendance calendar visualization
│   │   ├── QRScanner.tsx         # QR code scanner component
│   │   ├── QRDisplay.tsx         # QR code display (for warden)
│   │   ├── StatCard.tsx          # Dashboard stat cards
│   │   ├── EmptyState.tsx        # Empty list placeholders
│   │   └── ErrorBoundary.tsx     # Error boundary wrapper
│   ├── theme/                    # Design tokens
│   │   ├── colors.ts             # Color palette (light + dark)
│   │   ├── typography.ts         # Font scales
│   │   ├── spacing.ts            # Spacing scale
│   │   └── shadows.ts            # Shadow presets
│   ├── utils/                    # Utilities
│   │   ├── storage.ts            # MMKV wrapper for offline data
│   │   ├── device.ts             # Device fingerprint generation
│   │   ├── date.ts               # Date formatting helpers
│   │   └── permissions.ts        # Role/permission checks
│   └── constants/                # App constants
│       ├── api.ts                # API URLs, timeouts
│       └── roles.ts              # Role enum constants
├── assets/                       # Images, fonts, animations
│   ├── fonts/
│   ├── images/
│   └── animations/               # Lottie animations
├── app.json                      # Expo config (updated)
├── package.json                  # Dependencies (updated)
└── tsconfig.json                 # TypeScript config (updated)
```

---

### Phase 1: Foundation & Design System

> **Goal:** Set up the project architecture, install dependencies, create the design system, and build reusable UI primitives.

#### [MODIFY] [package.json](file:///D:/Apps/hostel/BMS_hostel/apps/mobile/package.json)
Add all required dependencies:

**Core:**
- `axios` — HTTP client with interceptors
- `zustand` — Lightweight state management
- `react-native-mmkv` — Fast key-value storage (offline + tokens)
- `@tanstack/react-query` — Server state caching + refetching

**Navigation & UI:**
- `@react-navigation/bottom-tabs` — Tab navigation
- `react-native-reanimated` — 60fps animations
- `react-native-gesture-handler` — Gestures
- `@gorhom/bottom-sheet` — Bottom sheet modals
- `react-native-svg` — SVG rendering
- `lottie-react-native` — Lottie animations

**Features:**
- `expo-camera` + `expo-barcode-scanner` — QR scanning
- `expo-location` — GPS for attendance
- `expo-local-authentication` — Biometric auth
- `expo-notifications` — Push notifications
- `expo-haptics` — Haptic feedback
- `expo-blur` — Glassmorphism effects
- `expo-linear-gradient` — Gradient backgrounds
- `react-native-qrcode-svg` — QR code generation (warden)
- `date-fns` — Date utilities

#### [NEW] `src/theme/colors.ts`
Premium color palette with light/dark mode:
- Primary: Deep indigo (#4F46E5 → #818CF8)
- Surface: Slate-based neutrals
- Semantic: Success green, Warning amber, Error rose, Info sky
- Glassmorphism: Semi-transparent overlays with blur

#### [NEW] `src/theme/typography.ts`
Type scale using Inter font (bundled via `expo-font`):
- Display (32px), Heading (24px), Title (20px), Body (16px), Caption (12px)

#### [NEW] `src/components/ui/*.tsx` (10 files)
Complete design system primitives: Button (4 variants × 3 sizes), Card (elevated/outlined/filled), Input (with validation states), Badge, Modal, Avatar, Skeleton loader, Toast notifications, BottomSheet wrapper.

---

### Phase 2: Auth & Navigation

> **Goal:** Implement secure auth flow with token management, biometric unlock, role-based routing, and the tab navigators for each persona.

#### [MODIFY] [_layout.tsx](file:///D:/Apps/hostel/BMS_hostel/apps/mobile/app/_layout.tsx)
Root layout becomes the auth orchestrator:
- Check `SecureStore` for tokens on mount
- If valid token → redirect to role-appropriate tab group
- If expired → attempt silent refresh via `POST /auth/refresh`
- If no token → show auth group
- Wrap with `ThemeProvider`, `QueryClientProvider`, `GestureHandlerRootView`

#### [MODIFY] [login.tsx](file:///D:/Apps/hostel/BMS_hostel/apps/mobile/app/login.tsx)
Complete rewrite with:
- Animated logo + gradient background
- Email/Mobile/USN input with smart keyboard type switching
- Secure password input with toggle visibility
- "Remember me" checkbox that persists identifier
- Biometric unlock button (if previously logged in)
- Loading state with haptic feedback on success
- Error handling with shake animation on failure
- Stores tokens in `expo-secure-store`, profile in Zustand

#### [NEW] `src/api/client.ts`
Axios instance with:
- Base URL from `EXPO_PUBLIC_API_URL`
- Request interceptor: attach `Authorization: Bearer <token>`
- Response interceptor: on 401 → attempt token refresh → retry original request
- Refresh mutex: prevent concurrent refresh calls
- Offline detection → queue requests for retry

#### [NEW] `src/store/auth.store.ts`
Zustand store managing:
- `user`, `roles[]`, `permissions[]`, `accessToken`, `refreshToken`
- `login()`, `logout()`, `refresh()`, `isAuthenticated`
- `hasRole(role)`, `hasPermission(permission)`
- Persist to `expo-secure-store`

#### [NEW] `app/(auth)/_layout.tsx`, `welcome.tsx`, `forgot-password.tsx`
Auth group screens with no tab bar.

#### [NEW] `app/(student)/_layout.tsx`
Bottom tab navigator with 4 tabs:
- 🏠 Home — Dashboard overview
- 📋 Attendance — Calendar + QR scan
- ✈️ Leave — Leave management
- ••• More — Complaints, notices, violations, gate, profile

#### [NEW] `app/(parent)/_layout.tsx`
Bottom tab navigator with 3 tabs:
- 🏠 Home — Ward status
- ✈️ Leave — Pending approvals
- 👤 Profile

#### [NEW] `app/(warden)/_layout.tsx`
Bottom tab navigator with 4 tabs:
- 📊 Dashboard — Live stats
- 📋 Roll Call — Session management
- ✈️ Leave — Approvals queue
- ••• More — Devices, gate, students

#### [NEW] `app/(security)/_layout.tsx`
Bottom tab navigator with 3 tabs:
- 🚪 Gate — Entry scanner
- 🎫 Passes — Verification
- 📝 Log — Today's history

#### Backend Additions (Minimal)

#### [MODIFY] [apps/api/src/auth/auth.controller.ts](file:///d:/Apps/hostel/BMS_hostel/apps/api/src/auth/auth.controller.ts)
Add `POST /auth/forgot-password` and `POST /auth/reset-password` endpoints using the existing `PasswordResetToken` schema model.

---

### Phase 3: Student Core Features

> **Goal:** Build the student dashboard, leave management, complaints, notices, violations, gate passes, notifications, and profile screens.

#### [NEW] `app/(student)/home.tsx`
Student dashboard with:
- Greeting header with avatar + name
- Quick actions row (Scan QR, Apply Leave, File Complaint)
- Today's attendance status card (PRESENT/ABSENT/ON_LEAVE with color)
- Active leave requests summary card
- Unread notices badge/carousel
- Recent violations alert (if any)
- Pull-to-refresh

#### [NEW] `app/(student)/leave/index.tsx`
Leave requests list:
- Tab filter: All / Pending / Approved / Rejected
- Leave cards with status badge, date range, type icon
- FAB button → apply new leave
- Calls `GET /leave` with `studentId` scoping

#### [NEW] `app/(student)/leave/apply.tsx`
Leave application form:
- Calls `GET /leave/eligibility` first — shows blocking message if ineligible
- Type picker (Home, Medical, Emergency, Other)
- Date range picker with calendar view
- Reason text area
- Proof upload (camera + gallery via `expo-image-picker`)
- Animated submit button with haptic feedback
- Calls `POST /leave`

#### [NEW] `app/(student)/leave/[id].tsx`
Leave detail screen:
- Full details card with timeline (Applied → Parent → Warden → Approved/Rejected)
- Status badge with color
- Cancel button (if PENDING)
- Parent/Warden approval timestamps

#### [NEW] `app/(student)/complaints/index.tsx` + `create.tsx`
- List with category filter + status chips
- Create form: category picker, subject, description, photo attachment
- Calls `POST /complaints`, `GET /complaints`

#### [NEW] `app/(student)/notices/index.tsx` + `[id].tsx`
- Notice feed with priority badges (INFO/WARNING/URGENT)
- Mark as read on view
- Calls `GET /notices`, `POST /notices/:id/read`

#### [NEW] `app/(student)/violations/index.tsx`
- Violation history with type icons (LATE_ENTRY, OVERSTAY, EARLY_EXIT)
- Escalation state badges
- Calls `GET /violations/my`

#### [NEW] `app/(student)/gate/index.tsx` + `request.tsx`
- Gate pass list with active/expired tabs
- Request form: purpose, visitor details, valid from/to
- Calls `GET /gate/passes`, `POST /gate/passes`

#### [NEW] `app/(student)/notifications.tsx`
- Notification feed with unread count badge on tab
- Mark as read / mark all as read
- Calls `GET /notifications`, `PATCH /notifications/:id/read`

#### [NEW] `app/(student)/profile/index.tsx`
- Profile card with avatar, USN, department, year
- Room/hostel info
- Settings: theme toggle, biometric toggle, logout
- Calls `GET /auth/me`, `GET /students/profiles/:userId`

---

### Phase 4: Attendance & QR System

> **Goal:** Implement the full attendance system — QR scanning, device registration, attendance calendar, and real-time monitoring.

#### [NEW] `app/(student)/attendance/index.tsx`
Attendance calendar screen:
- Monthly calendar heatmap (green=present, red=absent, yellow=late, blue=leave)
- Month navigation
- Attendance percentage stat
- Tap date → daily detail with firstIn/lastOut times
- Calls `GET /attendance/my`

#### [NEW] `app/(student)/attendance/scan.tsx`
QR scanning screen (anti-proxy enabled):
- Full-screen camera with QR overlay frame
- On scan → calls `POST /attendance/mark` with: `{ sessionId, token, fingerprint, gpsLat, gpsLng }`
- GPS permission request + location capture via `expo-location`
- Device fingerprint via `src/utils/device.ts`
- Success: confetti animation + haptic
- Error states: "Session expired", "Too far from hostel", "Device not registered", "Already marked"
- Auto-close after success

#### [NEW] `src/utils/device.ts`
Device fingerprint generation:
- Combines `expo-device` (brand, model, OS) + `expo-application` (install ID)
- Generates stable SHA-256 fingerprint
- Used for device registration + attendance anti-proxy

#### [NEW] Auto device registration flow
- On first QR scan attempt → if no device registered → calls `POST /attendance/devices/register`
- If device mismatch → shows "Device Changed" modal → calls `POST /attendance/devices/change-request`
- Pending request → shows "Awaiting warden approval" state

---

### Phase 5: Warden & Staff Features

> **Goal:** Build the warden dashboard, roll-call management, leave approvals, and device management screens.

#### [NEW] `app/(warden)/dashboard.tsx`
Live dashboard with:
- Presence board cards (In Hostel / Out Campus / On Leave counts)
- Today's attendance summary
- Pending actions count (leave requests, device changes)
- Recent gate activity feed
- Calls `GET /attendance/presence-board`, `GET /dashboard/stats`

#### [NEW] `app/(warden)/roll-call/create.tsx`
Start roll-call session:
- GPS auto-capture for anchor point
- Title input (e.g., "Evening Roll Call")
- Duration picker (15m, 30m, 45m, 1h)
- GPS radius selector (50m, 100m, 150m, 200m)
- Target hostel selector
- Calls `POST /attendance/sessions`

#### [NEW] `app/(warden)/roll-call/[id].tsx`
Live session view:
- Auto-refreshing QR code display (re-fetches `GET /attendance/sessions/:id/qr` every 25s)
- Large QR code rendered via `react-native-qrcode-svg`
- Live counter: "47/120 Present" with progress bar
- Present/absent student list with avatars
- Cancel session button
- Auto-refresh via `GET /attendance/sessions/:id/live`

#### [NEW] `app/(warden)/leave/index.tsx` + `[id].tsx`
Leave approval queue:
- List of pending leave requests with student info
- Detail screen with approve/reject buttons
- Calls `POST /leave/:id/warden-approve`, `POST /leave/:id/reject`

#### [NEW] `app/(warden)/devices/index.tsx` + `[id].tsx`
Device change request management:
- Pending requests list
- Detail with old/new device info + reason
- Approve/reject buttons
- Calls `GET /attendance/devices/requests`, `POST .../approve`, `POST .../reject`

#### [NEW] `app/(security)/gate.tsx`
Gate entry scanner:
- Camera-based student ID scan
- Manual student ID input
- Entry type toggle (IN/OUT)
- Calls `POST /gate/entries`
- Success confirmation with student photo + name

#### [NEW] `app/(security)/passes.tsx`
Gate pass verification:
- Scan or search by student ID
- Shows active passes with validity period
- Mark pass as used
- Calls `GET /gate/passes`, `PATCH /gate/passes/:id`

---

### Phase 6: Parent Portal

> **Goal:** Build the parent-facing screens for ward monitoring and leave approvals.

#### [NEW] `app/(parent)/home.tsx`
Ward status dashboard:
- Ward's attendance status today
- Recent gate activity (last in/out)
- Active leave status
- Unread notices
- Calls `GET /attendance/student/:id`, `GET /gate/entries`

#### [NEW] `app/(parent)/leave/index.tsx` + `[id].tsx`
Leave approval screen:
- Pending leave requests from ward
- Detail with full leave info
- Approve / Reject buttons with confirmation modal
- Calls `GET /leave`, `POST /leave/:id/parent-approve`, `POST /leave/:id/parent-reject`

---

### Phase 7: Polish, Animations & Testing

> **Goal:** Add premium animations, offline support, error boundaries, and comprehensive testing.

#### Animations & Polish
- Screen transition animations via `react-native-reanimated` layout animations
- Skeleton loading states on all list screens
- Pull-to-refresh with custom animated header
- Haptic feedback on all interactive elements
- Lottie animations for empty states, success, and error
- Dark mode support (system preference + manual toggle)
- App icon + splash screen configuration in [app.json](file:///D:/Apps/hostel/BMS_hostel/apps/mobile/app.json)

#### Offline Support
- MMKV caching for: profile data, attendance history, leave list, notices
- Offline queue for mutations (leave apply, complaint create)
- Network status banner at top when offline
- Auto-sync when connection restored

#### Error Handling
- Global error boundary with "Retry" option
- API error toast notifications
- Session expired → auto-redirect to login

---

## Verification Plan

### Automated Tests

**Unit tests** (Jest + React Testing Library):
```bash
cd apps/mobile
pnpm test
```
- `src/api/client.test.ts` — Token refresh interceptor, retry logic
- `src/store/auth.store.test.ts` — Login/logout state transitions
- `src/utils/device.test.ts` — Fingerprint generation consistency
- `src/utils/permissions.test.ts` — Role/permission check logic

**Component tests:**
- `src/components/ui/Button.test.tsx` — Variants, disabled state, loading
- `src/components/StatusBadge.test.tsx` — Status → color mapping

Run all tests: `pnpm --filter mobile test`

### Manual Verification

> [!IMPORTANT]
> The following manual tests require the API to be running (`pnpm --filter api dev`) and a seeded database (`pnpm db:seed`).

**Auth Flow:**
1. Launch app → should see Welcome/Login screen
2. Login with `admin@bms.local` / `Admin@123456` → should navigate to Warden dashboard
3. Close and reopen app → should auto-login (token in SecureStore)
4. Wait 15+ minutes → next API call should silently refresh token

**Student QR Attendance:**
1. Login as a student user
2. Navigate to Attendance tab → should show calendar heatmap
3. Tap "Scan QR" → should open camera with QR overlay
4. Scan valid session QR → should show success with haptic
5. Scan again → should show "Already marked" error

**Warden Roll Call:**
1. Login as warden
2. Navigate to Roll Call → Create Session
3. Set title, duration, radius → Start
4. Should show large QR code that rotates every 30s
5. Live counter should update as students scan

**Parent Leave Approval:**
1. Login as parent
2. If ward has pending leave → should show in Leave tab
3. Tap leave → see details → tap Approve → confirm
4. Status should change to PARENT_APPROVED

**Offline Behavior:**
1. Enable airplane mode
2. Navigate to cached screens (profile, attendance history) → should show cached data
3. Try to apply leave → should queue and show "Will sync when online"
4. Re-enable network → should auto-sync and show success toast

### Build Verification

```bash
# Type checking
cd apps/mobile && npx tsc --noEmit

# Lint
pnpm --filter mobile lint

# Expo doctor (dependency check)
npx expo-doctor

# Development build test
npx expo start --clear
```
