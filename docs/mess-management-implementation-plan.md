# Mess Management Module — Enterprise Implementation Plan

> **Date:** 2026-03-08 | **Module:** `apps/api/src/mess/`
> **Scope:** Backend + Web Dashboard + Mobile App (all 5 role groups)
> **Pre-existing RBAC:** `MESS_MANAGER`, `MESS_STAFF` roles; `MESS_MANAGE`, `MESS_SCAN` permissions — already seeded
> **Pre-existing Schema References:** `ComplaintCategory.MESS`, `FeeType.MESS_FEE`, `HostelRegistration.messType`, `HostelRegistration.messRollNo`

---

## 1. Domain Analysis

### 1.1 What Is Mess Management in Indian College Hostels?

A hostel mess (dining hall) serves 3–4 meals daily to hundreds of students. The system must handle:

| Concern | Description |
|---|---|
| **Menu Planning** | Weekly rotating menu per meal type (breakfast, lunch, snacks, dinner), seasonal changes, VEG/NON_VEG tracks |
| **Meal Scanning** | Counter-based check-in (QR or ID scan) to log who ate what meal — prevents freeloading, enables rebates |
| **Rebate/Refund** | Students on approved leave get mess fee rebates. Minimum absence days (typically 3+) required per policy |
| **Feedback** | Per-meal quality feedback (1–5 stars + optional comment) drives menu improvement |
| **Inventory & Billing** | Monthly consumption reports, per-student billing, VEG vs NON_VEG cost differences |
| **Special Meals** | Festival meals, dietary restrictions, guest meals (external visitors eating at mess) |
| **Mess Committee** | Student representatives for menu decisions — out of scope for Phase 1 |

### 1.2 Actors & Permissions

| Actor | Actions | RBAC |
|---|---|---|
| **SUPER_ADMIN** | Full control | `MESS_MANAGE` + all |
| **HOSTEL_ADMIN** | Manage menus, view reports, manage mess assignments | `MESS_MANAGE` |
| **MESS_MANAGER** | CRUD menus, view scan logs, generate reports, manage guest meals | `MESS_MANAGE`, `MESS_SCAN` |
| **MESS_STAFF** | Scan meals at counter (read-only view of menu) | `MESS_SCAN` |
| **WARDEN** | View reports, override rebates | `REPORT_VIEW` |
| **STUDENT** | View today's menu, scan in at counter, submit feedback, view own meal history, request rebate | — (own data only) |
| **PARENT** | View child's meal history | — (read-only) |

---

## 2. Database Schema Design

### 2.1 New Enums

```prisma
enum MealType {
  BREAKFAST
  LUNCH
  SNACKS
  DINNER
}

enum MessType {
  VEG
  NON_VEG
}

enum DayOfWeek {
  MONDAY
  TUESDAY
  WEDNESDAY
  THURSDAY
  FRIDAY
  SATURDAY
  SUNDAY
}

enum MealScanStatus {
  SCANNED
  CANCELLED    // Cancelled within grace period
}

enum RebateStatus {
  PENDING
  APPROVED
  REJECTED
  CREDITED
}

enum MenuStatus {
  DRAFT
  ACTIVE
  ARCHIVED
}
```

### 2.2 New Models

```prisma
// ─────────────────────────────────────────────────
// MESS MENU — Weekly rotating menu template
// ─────────────────────────────────────────────────
model MessMenu {
  id          String     @id @default(uuid()) @db.Uuid
  hostelId    String     @map("hostel_id") @db.Uuid
  name        String     @db.VarChar(200)         // e.g. "Spring 2026 Week Menu"
  messType    MessType   @map("mess_type")        // VEG or NON_VEG
  status      MenuStatus @default(DRAFT)
  effectiveFrom DateTime @map("effective_from") @db.Date
  effectiveTo   DateTime? @map("effective_to") @db.Date
  createdById   String   @map("created_by_id") @db.Uuid
  notes         String?  @db.Text

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  hostel    Hostel   @relation("MessMenuHostel", fields: [hostelId], references: [id])
  createdBy User     @relation("MessMenuCreator", fields: [createdById], references: [id])
  items     MessMenuItem[]

  @@unique([hostelId, messType, status], map: "uq_active_menu")  // Only 1 active menu per hostel+type
  @@index([hostelId])
  @@index([status])
  @@index([effectiveFrom])
  @@map("mess_menus")
}

// ─────────────────────────────────────────────────
// MESS MENU ITEM — Individual dish per day+meal slot
// ─────────────────────────────────────────────────
model MessMenuItem {
  id        String    @id @default(uuid()) @db.Uuid
  menuId    String    @map("menu_id") @db.Uuid
  day       DayOfWeek
  mealType  MealType  @map("meal_type")
  items     String    @db.Text              // Comma-separated dish names: "Idli, Sambar, Chutney, Coffee"
  specialNote String? @map("special_note") @db.VarChar(500)  // "Festival special", "Chef's choice"

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  menu MessMenu @relation(fields: [menuId], references: [id], onDelete: Cascade)

  @@unique([menuId, day, mealType], map: "uq_menu_day_meal")
  @@index([menuId])
  @@map("mess_menu_items")
}

// ─────────────────────────────────────────────────
// MEAL SCAN — Per-student per-meal attendance log
// ─────────────────────────────────────────────────
model MealScan {
  id          String         @id @default(uuid()) @db.Uuid
  studentId   String         @map("student_id") @db.Uuid
  hostelId    String         @map("hostel_id") @db.Uuid
  date        DateTime       @db.Date
  mealType    MealType       @map("meal_type")
  scannedAt   DateTime       @default(now()) @map("scanned_at")
  scannedById String         @map("scanned_by_id") @db.Uuid  // Mess staff who scanned
  status      MealScanStatus @default(SCANNED)
  isGuest     Boolean        @default(false) @map("is_guest")
  guestName   String?        @map("guest_name") @db.VarChar(200)
  guestCount  Int            @default(1) @map("guest_count")
  notes       String?        @db.VarChar(500)
  deviceFingerprint String?  @map("device_fingerprint") @db.VarChar(255)

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  student   User   @relation("MealScanStudent", fields: [studentId], references: [id], onDelete: Cascade)
  hostel    Hostel @relation("MealScanHostel", fields: [hostelId], references: [id])
  scannedBy User   @relation("MealScanStaff", fields: [scannedById], references: [id])

  @@unique([studentId, date, mealType], map: "uq_student_meal_per_day")  // One scan per meal per day
  @@index([studentId])
  @@index([hostelId])
  @@index([date])
  @@index([mealType])
  @@index([scannedAt])
  @@map("meal_scans")
}

// ─────────────────────────────────────────────────
// MEAL FEEDBACK — Student rates a meal (1–5 stars)
// ─────────────────────────────────────────────────
model MealFeedback {
  id         String   @id @default(uuid()) @db.Uuid
  studentId  String   @map("student_id") @db.Uuid
  hostelId   String   @map("hostel_id") @db.Uuid
  date       DateTime @db.Date
  mealType   MealType @map("meal_type")
  rating     Int                           // 1–5 stars
  comment    String?  @db.Text
  isAnonymous Boolean @default(false) @map("is_anonymous")

  createdAt DateTime @default(now()) @map("created_at")

  student User   @relation("MealFeedbackStudent", fields: [studentId], references: [id], onDelete: Cascade)
  hostel  Hostel @relation("MealFeedbackHostel", fields: [hostelId], references: [id])

  @@unique([studentId, date, mealType], map: "uq_feedback_per_meal")
  @@index([hostelId])
  @@index([date])
  @@index([rating])
  @@map("meal_feedback")
}

// ─────────────────────────────────────────────────
// MESS REBATE — Fee refund for absent meals
// ─────────────────────────────────────────────────
model MessRebate {
  id           String       @id @default(uuid()) @db.Uuid
  studentId    String       @map("student_id") @db.Uuid
  hostelId     String       @map("hostel_id") @db.Uuid
  fromDate     DateTime     @map("from_date") @db.Date
  toDate       DateTime     @map("to_date") @db.Date
  totalMeals   Int          @map("total_meals")       // Calculated: meals missed in period
  amount       Float?                                  // Rebate amount (filled on approval)
  status       RebateStatus @default(PENDING)
  reason       String       @db.Text                   // "Home leave", "Medical leave"
  leaveId      String?      @map("leave_id") @db.Uuid  // Link to approved leave (optional)
  reviewedById String?      @map("reviewed_by_id") @db.Uuid
  reviewedAt   DateTime?    @map("reviewed_at")
  reviewNotes  String?      @map("review_notes") @db.Text

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  student    User          @relation("RebateStudent", fields: [studentId], references: [id], onDelete: Cascade)
  hostel     Hostel        @relation("RebateHostel", fields: [hostelId], references: [id])
  leave      LeaveRequest? @relation("RebateLeave", fields: [leaveId], references: [id])
  reviewedBy User?         @relation("RebateReviewer", fields: [reviewedById], references: [id])

  @@index([studentId])
  @@index([hostelId])
  @@index([status])
  @@index([fromDate, toDate])
  @@map("mess_rebates")
}
```

### 2.3 Relation Additions to Existing Models

```prisma
// Add to User model:
  mealScans           MealScan[]        @relation("MealScanStudent")
  mealScansAsStaff    MealScan[]        @relation("MealScanStaff")
  mealFeedback        MealFeedback[]    @relation("MealFeedbackStudent")
  messRebates         MessRebate[]      @relation("RebateStudent")
  messRebatesReviewed MessRebate[]      @relation("RebateReviewer")
  messMenusCreated    MessMenu[]        @relation("MessMenuCreator")

// Add to Hostel model:
  messMenus     MessMenu[]     @relation("MessMenuHostel")
  mealScans     MealScan[]     @relation("MealScanHostel")
  mealFeedback  MealFeedback[] @relation("MealFeedbackHostel")
  messRebates   MessRebate[]   @relation("RebateHostel")

// Add to LeaveRequest model:
  messRebates   MessRebate[]   @relation("RebateLeave")
```

### 2.4 Total Schema Addition

| New Models | New Enums | Relation Updates |
|---|---|---|
| 5 (MessMenu, MessMenuItem, MealScan, MealFeedback, MessRebate) | 6 (MealType, MessType, DayOfWeek, MealScanStatus, RebateStatus, MenuStatus) | 3 models updated (User, Hostel, LeaveRequest) |

---

## 3. API Endpoint Design

### 3.1 Menu Management (6 endpoints)

| Method | Path | Roles | Description |
|---|---|---|---|
| `POST` | `/mess/menus` | SUPER_ADMIN, HOSTEL_ADMIN, MESS_MANAGER | Create new menu (with items) |
| `GET` | `/mess/menus` | SUPER_ADMIN, HOSTEL_ADMIN, MESS_MANAGER, WARDEN | List menus (filter by hostel, status, messType) |
| `GET` | `/mess/menus/:id` | SUPER_ADMIN, HOSTEL_ADMIN, MESS_MANAGER, WARDEN | Get menu with all items |
| `PATCH` | `/mess/menus/:id` | SUPER_ADMIN, HOSTEL_ADMIN, MESS_MANAGER | Update menu + items |
| `POST` | `/mess/menus/:id/activate` | SUPER_ADMIN, HOSTEL_ADMIN, MESS_MANAGER | Activate menu (deactivates previous) |
| `POST` | `/mess/menus/:id/archive` | SUPER_ADMIN, HOSTEL_ADMIN, MESS_MANAGER | Archive menu |

### 3.2 Today's Menu (2 endpoints — public-ish)

| Method | Path | Roles | Description |
|---|---|---|---|
| `GET` | `/mess/today` | Any authenticated user | Get today's menu for student's hostel (auto-resolves VEG/NON_VEG from registration) |
| `GET` | `/mess/week` | Any authenticated user | Get full week menu for student's hostel |

### 3.3 Meal Scanning (5 endpoints)

| Method | Path | Roles | Description |
|---|---|---|---|
| `POST` | `/mess/scan` | SUPER_ADMIN, MESS_MANAGER, MESS_STAFF | Scan student meal (by student ID or QR code) |
| `POST` | `/mess/scan/guest` | SUPER_ADMIN, MESS_MANAGER | Log guest meal |
| `GET` | `/mess/scans` | SUPER_ADMIN, HOSTEL_ADMIN, MESS_MANAGER, WARDEN | List scans (filter by date, meal, hostel) |
| `GET` | `/mess/scans/live` | SUPER_ADMIN, MESS_MANAGER, MESS_STAFF | Live meal count for current meal slot |
| `DELETE` | `/mess/scans/:id` | SUPER_ADMIN, MESS_MANAGER | Cancel scan within grace period (15 min) |

### 3.4 Student Self-Service (3 endpoints)

| Method | Path | Roles | Description |
|---|---|---|---|
| `GET` | `/mess/my/history` | STUDENT | Own meal scan history (paginated, filterable by date range) |
| `GET` | `/mess/my/stats` | STUDENT | Own monthly stats (meals taken by type, total cost) |
| `POST` | `/mess/feedback` | STUDENT | Submit feedback for a meal |

### 3.5 Rebates (5 endpoints)

| Method | Path | Roles | Description |
|---|---|---|---|
| `POST` | `/mess/rebates` | STUDENT | Request rebate (with date range, reason, optional leaveId) |
| `GET` | `/mess/rebates` | SUPER_ADMIN, HOSTEL_ADMIN, MESS_MANAGER, WARDEN, STUDENT | List rebates (students see own, admins see all) |
| `GET` | `/mess/rebates/:id` | SUPER_ADMIN, HOSTEL_ADMIN, MESS_MANAGER, WARDEN, STUDENT | Get rebate detail |
| `POST` | `/mess/rebates/:id/approve` | SUPER_ADMIN, HOSTEL_ADMIN, WARDEN | Approve rebate (set amount) |
| `POST` | `/mess/rebates/:id/reject` | SUPER_ADMIN, HOSTEL_ADMIN, WARDEN | Reject rebate (with reason) |

### 3.6 Reports & Stats (3 endpoints)

| Method | Path | Roles | Description |
|---|---|---|---|
| `GET` | `/mess/stats` | SUPER_ADMIN, HOSTEL_ADMIN, MESS_MANAGER, WARDEN | Aggregate stats: daily/weekly/monthly meal counts, avg feedback, rebate totals |
| `GET` | `/mess/reports/consumption` | SUPER_ADMIN, HOSTEL_ADMIN, MESS_MANAGER | Per-student consumption report (CSV exportable) |
| `GET` | `/mess/reports/feedback` | SUPER_ADMIN, HOSTEL_ADMIN, MESS_MANAGER | Feedback analytics: avg rating by meal, trend, worst-rated items |

**Total: 24 new endpoints**

---

## 4. Backend File Structure

```
apps/api/src/mess/
├── mess.module.ts
├── mess.controller.ts           # Menu + Today/Week + Stats + Reports
├── mess-scan.controller.ts      # Scan + Live + Student self-service
├── mess-rebate.controller.ts    # Rebate CRUD + approval
├── mess.service.ts              # Menu business logic
├── mess-scan.service.ts         # Scan business logic + live counts
├── mess-rebate.service.ts       # Rebate business logic + auto-link to leave
├── dto/
│   ├── create-menu.dto.ts       # Menu + items in one payload
│   ├── update-menu.dto.ts
│   ├── query-menu.dto.ts
│   ├── scan-meal.dto.ts
│   ├── scan-guest.dto.ts
│   ├── query-scans.dto.ts
│   ├── create-feedback.dto.ts
│   ├── create-rebate.dto.ts
│   ├── query-rebates.dto.ts
│   ├── review-rebate.dto.ts
│   ├── query-stats.dto.ts
│   └── query-report.dto.ts
└── mess.service.spec.ts         # Unit tests
```

---

## 5. Web Dashboard Design

### 5.1 Routes

| Route | Page | Key UI |
|---|---|---|
| `/dashboard/mess` | Overview | Stat cards (today's meals served, pending rebates, avg rating), quick actions, current meal live count |
| `/dashboard/mess/menus` | Menu Manager | Create/edit weekly menu grid (7 days × 4 meals), drag-and-drop dish ordering, VEG/NON_VEG tabs |
| `/dashboard/mess/menus/[id]` | Menu Detail | Full week view, activate/archive actions, edit items inline |
| `/dashboard/mess/scans` | Scan Log | DataTable with date/meal/hostel filters, live counter widget for current meal |
| `/dashboard/mess/scan` | Scan Station | Large QR/ID input, current meal auto-detected, success/error feedback with sound, guest meal toggle |
| `/dashboard/mess/rebates` | Rebate Queue | Filterable list (Pending/Approved/Rejected), approve/reject modals with amount input |
| `/dashboard/mess/feedback` | Feedback Analytics | Rating charts (pie by meal, trend line by week), worst-rated items table, comment feed |
| `/dashboard/mess/reports` | Reports | Monthly consumption table, CSV export, per-student drill-down |

### 5.2 File Structure

```
apps/web/src/app/dashboard/mess/
├── page.tsx                     # Overview/stats
├── menus/
│   ├── page.tsx                 # Menu list + create
│   └── [id]/
│       └── page.tsx             # Menu detail + edit
├── scans/
│   └── page.tsx                 # Scan log
├── scan/
│   └── page.tsx                 # Scan station (dedicated screen)
├── rebates/
│   └── page.tsx                 # Rebate queue
├── feedback/
│   └── page.tsx                 # Feedback analytics
└── reports/
    └── page.tsx                 # Consumption reports
```

### 5.3 Navigation Addition

Add to `NAV_SECTIONS` in [apps/web/src/lib/constants.ts](apps/web/src/lib/constants.ts):

```typescript
{
  title: 'Mess',
  icon: 'utensils',
  items: [
    { title: 'Overview',  href: '/dashboard/mess',          roles: ['SUPER_ADMIN', 'HOSTEL_ADMIN', 'MESS_MANAGER', 'WARDEN'] },
    { title: 'Menus',     href: '/dashboard/mess/menus',    roles: ['SUPER_ADMIN', 'HOSTEL_ADMIN', 'MESS_MANAGER'] },
    { title: 'Scan',      href: '/dashboard/mess/scan',     roles: ['SUPER_ADMIN', 'MESS_MANAGER', 'MESS_STAFF'] },
    { title: 'Scan Log',  href: '/dashboard/mess/scans',    roles: ['SUPER_ADMIN', 'HOSTEL_ADMIN', 'MESS_MANAGER', 'WARDEN'] },
    { title: 'Rebates',   href: '/dashboard/mess/rebates',  roles: ['SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN'] },
    { title: 'Feedback',  href: '/dashboard/mess/feedback', roles: ['SUPER_ADMIN', 'HOSTEL_ADMIN', 'MESS_MANAGER'] },
    { title: 'Reports',   href: '/dashboard/mess/reports',  roles: ['SUPER_ADMIN', 'HOSTEL_ADMIN', 'MESS_MANAGER'] },
  ],
}
```

---

## 6. Mobile App Design

### 6.1 Student Screens (4 new screens)

| Screen | Path | Feature |
|---|---|---|
| Today's Menu | `(student)/mess/index.tsx` | Card-based meal display for today (auto VEG/NON_VEG), swipe for tomorrow |
| Week Menu | `(student)/mess/week.tsx` | Full 7-day scrollable grid |
| Meal History | `(student)/mess/history.tsx` | Monthly calendar view showing which meals were scanned, stats card (meals taken / total) |
| Submit Feedback | `(student)/mess/feedback.tsx` | Star rating (1–5) + comment for today's meals, shown after meal time window |

### 6.2 Parent Screen (1 new screen)

| Screen | Path | Feature |
|---|---|---|
| Child's Meal History | `(parent)/mess.tsx` | Read-only view of child's monthly meal scan history |

### 6.3 Warden Screen (1 new screen)

| Screen | Path | Feature |
|---|---|---|
| Mess Overview | `(warden)/mess.tsx` | Today's live meal count, pending rebates count, weekly feedback summary |

### 6.4 Mobile File Structure

```
apps/mobile/app/
├── (student)/
│   └── mess/
│       ├── _layout.tsx
│       ├── index.tsx           # Today's menu
│       ├── week.tsx            # Week menu
│       ├── history.tsx         # Meal history
│       └── feedback.tsx        # Submit feedback
├── (parent)/
│   └── mess.tsx                # Child's meal history
└── (warden)/
    └── mess.tsx                # Mess overview

apps/mobile/src/api/
└── mess.api.ts                 # All mess API functions
```

### 6.5 API Client Addition

```typescript
// apps/mobile/src/api/mess.api.ts
export const messApi = {
  // Menu
  today:           ()                     => client.get('/mess/today'),
  week:            ()                     => client.get('/mess/week'),

  // Student self-service
  myHistory:       (params)               => client.get('/mess/my/history', { params }),
  myStats:         ()                     => client.get('/mess/my/stats'),
  submitFeedback:  (data)                 => client.post('/mess/feedback', data),

  // Warden/Admin
  stats:           (params?)              => client.get('/mess/stats', { params }),
  scansLive:       ()                     => client.get('/mess/scans/live'),
  rebates:         (params)               => client.get('/mess/rebates', { params }),
};
```

---

## 7. Business Logic Specifications

### 7.1 Menu Activation Rules

1. Only one menu can be `ACTIVE` per hostel per `MessType` (VEG/NON_VEG) at a time
2. Activating a new menu auto-archives the previous active menu
3. `effectiveFrom` must be a Monday (weekly cycle)
4. A menu must have at least 7 × 4 = 28 items (all slots filled) to be activated

### 7.2 Meal Scanning Rules

1. **Time Windows** (configurable per hostel policy, defaults):
   - Breakfast: 07:00–09:30
   - Lunch: 12:00–14:30
   - Snacks: 16:00–17:30
   - Dinner: 19:00–21:30
2. Scans outside the time window are rejected with `BadRequestException`
3. One scan per student per meal per day (enforced by unique constraint)
4. Duplicate scan returns the existing record instead of creating a new one
5. **Grace Period Cancellation**: Scans can be cancelled within 15 minutes of creation
6. Guest meals require `MESS_MANAGE` permission and log the guest name + count
7. `deviceFingerprint` is captured for audit trail (same pattern as attendance)

### 7.3 Rebate Rules

1. Minimum absence: 3+ consecutive days required for rebate eligibility
2. Rebate amount = `missed_meals × per_meal_rate` (per-meal rate from hostel policy)
3. **Auto-linking**: When a `LeaveRequest` is `WARDEN_APPROVED`, the system auto-calculates `totalMeals` missed for the leave period based on existing scans
4. Students cannot request rebates for dates with recorded meal scans
5. Rebate approval triggers a `Notification` to the student
6. Only `PENDING` rebates can be approved/rejected

### 7.4 Feedback Rules

1. Feedback can only be submitted within 4 hours after the meal time window ends
2. One feedback per student per meal per day (unique constraint)
3. Anonymous feedback stores `studentId` internally (for dedup) but hides identity in reports
4. Rating 1–5 validated by DTO

### 7.5 Auto-Rebate from Leave (Cross-Module Integration)

When `LeaveService.wardenApprove()` is called:
```
1. Get approved leave date range (fromDate → toDate)
2. Count meal slots in range (days × 4 meals)
3. Subtract any existing MealScans in that range
4. If net missed meals ≥ threshold → auto-create MessRebate with status PENDING
5. Dispatch notification to student: "Mess rebate of ₹{amount} pending for leave #{leaveId}"
```

---

## 8. Dashboard Stats Queries

The `/mess/stats` endpoint returns:

```typescript
{
  today: {
    breakfast: { served: 142, total: 380, percentage: 37.4 },
    lunch:     { served: 285, total: 380, percentage: 75.0 },
    snacks:    { served: 0,   total: 380, percentage: 0 },     // Future meal
    dinner:    { served: 0,   total: 380, percentage: 0 },     // Future meal
  },
  currentMeal: { type: 'LUNCH', served: 285, window: '12:00–14:30', isActive: true },
  thisMonth: {
    totalMealsServed: 8420,
    avgDailyAttendance: 302,
    guestMeals: 47,
    avgRating: 3.8,
  },
  pendingRebates: { count: 12, totalAmount: 4800 },
  feedbackTrend: [
    { week: '2026-W09', avgRating: 3.6 },
    { week: '2026-W10', avgRating: 3.9 },
  ],
}
```

---

## 9. Implementation Sequence

### Phase 1: Core (Backend + Web) — Sprint 1

| # | Task | Files | Est. |
|---|---|---|---|
| 1 | Add Prisma schema (6 enums + 5 models + relation updates) | `schema.prisma` | 1h |
| 2 | Run migration | `prisma migrate dev --name add-mess-module` | 5m |
| 3 | Create `mess.module.ts` + register in `app.module.ts` | `mess.module.ts`, `app.module.ts` | 15m |
| 4 | Implement DTOs (12 files) | `dto/` | 2h |
| 5 | Implement `mess.service.ts` (menu CRUD + today/week) | `mess.service.ts` | 3h |
| 6 | Implement `mess.controller.ts` (menu + today/week + stats) | `mess.controller.ts` | 2h |
| 7 | Implement `mess-scan.service.ts` (scan + live + history) | `mess-scan.service.ts` | 3h |
| 8 | Implement `mess-scan.controller.ts` | `mess-scan.controller.ts` | 1.5h |
| 9 | Implement `mess-rebate.service.ts` (CRUD + approval) | `mess-rebate.service.ts` | 2h |
| 10 | Implement `mess-rebate.controller.ts` | `mess-rebate.controller.ts` | 1h |
| 11 | Add auto-rebate hook in `leave.service.ts` `wardenApprove()` | `leave.service.ts` | 1h |
| 12 | Unit tests | `mess.service.spec.ts` | 2h |

### Phase 2: Web Dashboard — Sprint 1–2

| # | Task | Files | Est. |
|---|---|---|---|
| 13 | Add Mess to sidebar navigation | `constants.ts`, `sidebar.tsx` | 15m |
| 14 | Overview page (stats + live counter) | `mess/page.tsx` | 3h |
| 15 | Menu Manager (create/edit grid) | `mess/menus/page.tsx` | 4h |
| 16 | Menu Detail page | `mess/menus/[id]/page.tsx` | 2h |
| 17 | Scan Station page | `mess/scan/page.tsx` | 3h |
| 18 | Scan Log page | `mess/scans/page.tsx` | 2h |
| 19 | Rebate Queue page | `mess/rebates/page.tsx` | 3h |
| 20 | Feedback Analytics page | `mess/feedback/page.tsx` | 3h |
| 21 | Reports page (with CSV export) | `mess/reports/page.tsx` | 3h |

### Phase 3: Mobile App — Sprint 2

| # | Task | Files | Est. |
|---|---|---|---|
| 22 | Create `mess.api.ts` | `src/api/mess.api.ts` | 1h |
| 23 | Student: Today's Menu | `(student)/mess/index.tsx` | 2h |
| 24 | Student: Week Menu | `(student)/mess/week.tsx` | 1.5h |
| 25 | Student: Meal History | `(student)/mess/history.tsx` | 2h |
| 26 | Student: Feedback | `(student)/mess/feedback.tsx` | 1.5h |
| 27 | Parent: Meal History | `(parent)/mess.tsx` | 1h |
| 28 | Warden: Mess Overview | `(warden)/mess.tsx` | 1.5h |
| 29 | Update tab navigators (student + warden + parent layouts) | `_layout.tsx` × 3 | 30m |

### Phase 4: Polish — Sprint 2

| # | Task | Est. |
|---|---|---|
| 30 | Add mess stats to main Dashboard endpoint | 1h |
| 31 | Add mess notification triggers (rebate approved, low attendance alert) | 1.5h |
| 32 | Seed sample menu data for dev/demo | 1h |
| 33 | E2E testing of full scan → rebate flow | 2h |

---

## 10. Key Technical Decisions

| Decision | Rationale |
|---|---|
| **Separate controllers** for menu, scan, rebate | Single Responsibility — each concern is independently testable and the files stay under 300 lines |
| **`MessType` enum** instead of reusing `HostelRegistration.messType` string | Type safety, Prisma-level validation, query filtering |
| **Unique constraint on scan** (`studentId + date + mealType`) | Database-level dedup prevents double scanning even under race conditions |
| **Auto-rebate on leave approval** | Reduces manual work — most rebates are leave-linked. Manual rebate request is fallback |
| **Time-window validation in service, not DB** | Windows are configurable per hostel policy and may change; business logic belongs in service layer |
| **Guest meals on same `MealScan` table** with `isGuest` flag | Avoids duplicate table; simplifies reporting queries |
| **No separate `Dish` model** | Menu items stored as comma-separated text. A dish master table adds complexity without proportional value in Phase 1. Can be normalized in Phase 2 if analytics demand per-dish tracking |
| **`deviceFingerprint` on scans** | Matches attendance anti-proxy pattern. Enables detection of staff scanning from unauthorized devices |

---

## 11. Risk Assessment

| Risk | Impact | Mitigation |
|---|---|---|
| **High scan volume** at meal times (~400 students × 4 meals × 7 days = 11,200 scans/week) | DB write pressure | Unique constraint prevents duplicates. Index on `(studentId, date, mealType)`. Consider BullMQ queue for async write in Phase 2 |
| **Time-window bypass** by manipulating client clock | Fraudulent scans | Validate against server time only. Client time is never trusted |
| **Menu change mid-week** | Student confusion | Menus activate only on Monday (`effectiveFrom` = Monday validation). Mid-week changes require archiving and creating new menu |
| **Rebate gaming** | Financial loss | Cross-reference with MealScan records. Cannot claim rebate for dates with scans. Leave-linking provides audit trail |
| **Concurrent duplicate scans** | Data integrity | Unique DB constraint + catch `P2002` Prisma error → return existing record |

---

*This plan follows the exact patterns, conventions, and architecture of the existing BMS Hostel Platform modules (field naming, DTO structure, guard decorators, audit interceptors, response shape, testing patterns). Every design decision is traceable to an existing precedent in the codebase.*
