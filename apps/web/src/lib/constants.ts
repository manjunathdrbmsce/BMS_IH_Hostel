// ============================================================================
// NAVIGATION — Enterprise Role-Based Navigation System
// ============================================================================

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles: readonly string[];
  badge?: string;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

/**
 * Grouped navigation sections. Each role sees only relevant sections/items.
 * Roles: SUPER_ADMIN, HOSTEL_ADMIN, WARDEN, DEPUTY_WARDEN, ACCOUNTS_OFFICER,
 *        MESS_MANAGER, MESS_STAFF, SECURITY_GUARD, MAINTENANCE_STAFF, STUDENT, PARENT
 */
export const NAV_SECTIONS: NavSection[] = [
  // ── Overview ──────────────────────────────────────────────────────────
  {
    label: 'Overview',
    items: [
      {
        label: 'Dashboard',
        href: '/dashboard',
        icon: 'LayoutDashboard',
        roles: [
          'SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN',
          'ACCOUNTS_OFFICER', 'MESS_MANAGER', 'MESS_STAFF',
          'SECURITY_GUARD', 'MAINTENANCE_STAFF', 'STUDENT', 'PARENT',
        ],
      },
    ],
  },

  // ── Administration ────────────────────────────────────────────────────
  {
    label: 'Administration',
    items: [
      {
        label: 'Users',
        href: '/dashboard/users',
        icon: 'Users',
        roles: ['SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN'],
      },
      {
        label: 'Buildings',
        href: '/dashboard/buildings',
        icon: 'Building',
        roles: ['SUPER_ADMIN', 'HOSTEL_ADMIN'],
      },
      {
        label: 'Hostels',
        href: '/dashboard/hostels',
        icon: 'Building2',
        roles: ['SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN'],
      },
      {
        label: 'Rooms & Beds',
        href: '/dashboard/rooms',
        icon: 'DoorOpen',
        roles: ['SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN'],
      },
      {
        label: 'Policies',
        href: '/dashboard/policies',
        icon: 'ShieldCheck',
        roles: ['SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN'],
      },
    ],
  },

  // ── Student Management ────────────────────────────────────────────────
  {
    label: 'Student Management',
    items: [
      {
        label: 'Students',
        href: '/dashboard/students',
        icon: 'GraduationCap',
        roles: ['SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN', 'PARENT'],
      },
      {
        label: 'Allotments',
        href: '/dashboard/allotments',
        icon: 'BedDouble',
        roles: ['SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN'],
      },
      {
        label: 'Registration',
        href: '/dashboard/registration',
        icon: 'ClipboardList',
        roles: [
          'SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN',
          'ACCOUNTS_OFFICER', 'STUDENT',
        ],
      },
      {
        label: 'Leave Requests',
        href: '/dashboard/leave',
        icon: 'CalendarOff',
        roles: [
          'SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN',
          'STUDENT', 'PARENT',
        ],
      },
    ],
  },

  // ── Security & Gate ───────────────────────────────────────────────────
  {
    label: 'Security & Gate',
    items: [
      {
        label: 'Gate Management',
        href: '/dashboard/gate',
        icon: 'ScanLine',
        roles: ['SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN', 'SECURITY_GUARD'],
      },
      {
        label: 'Attendance',
        href: '/dashboard/attendance',
        icon: 'ClipboardCheck',
        roles: ['SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN', 'STUDENT', 'PARENT'],
      },
      {
        label: 'Violations',
        href: '/dashboard/violations',
        icon: 'ShieldAlert',
        roles: ['SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN', 'STUDENT', 'PARENT'],
      },
    ],
  },

  // ── Communication ─────────────────────────────────────────────────────
  {
    label: 'Communication',
    items: [
      {
        label: 'Complaints',
        href: '/dashboard/complaints',
        icon: 'MessageSquareWarning',
        roles: [
          'SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN',
          'MAINTENANCE_STAFF', 'STUDENT',
        ],
      },
      {
        label: 'Notices',
        href: '/dashboard/notices',
        icon: 'Megaphone',
        roles: [
          'SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN',
          'MESS_MANAGER', 'STUDENT', 'PARENT',
        ],
      },
      {
        label: 'Notifications',
        href: '/dashboard/notifications',
        icon: 'Bell',
        roles: [
          'SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN',
          'ACCOUNTS_OFFICER', 'MESS_MANAGER', 'MESS_STAFF',
          'SECURITY_GUARD', 'MAINTENANCE_STAFF', 'STUDENT', 'PARENT',
        ],
      },
    ],
  },

  // ── Mess Management ────────────────────────────────────────────────────
  {
    label: 'Mess Management',
    items: [
      {
        label: 'Mess Overview',
        href: '/dashboard/mess',
        icon: 'UtensilsCrossed',
        roles: ['SUPER_ADMIN', 'HOSTEL_ADMIN', 'MESS_MANAGER', 'WARDEN'],
      },
      {
        label: 'Menus',
        href: '/dashboard/mess/menus',
        icon: 'UtensilsCrossed',
        roles: ['SUPER_ADMIN', 'HOSTEL_ADMIN', 'MESS_MANAGER'],
      },
      {
        label: 'Scan Station',
        href: '/dashboard/mess/scan',
        icon: 'ScanLine',
        roles: ['SUPER_ADMIN', 'MESS_MANAGER', 'MESS_STAFF'],
      },
      {
        label: 'Scan Log',
        href: '/dashboard/mess/scans',
        icon: 'ClipboardCheck',
        roles: ['SUPER_ADMIN', 'HOSTEL_ADMIN', 'MESS_MANAGER', 'WARDEN'],
      },
      {
        label: 'Rebates',
        href: '/dashboard/mess/rebates',
        icon: 'CalendarOff',
        roles: ['SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN'],
      },
      {
        label: 'Feedback',
        href: '/dashboard/mess/feedback',
        icon: 'MessageSquareWarning',
        roles: ['SUPER_ADMIN', 'HOSTEL_ADMIN', 'MESS_MANAGER'],
      },
      {
        label: 'Reports',
        href: '/dashboard/mess/reports',
        icon: 'ScrollText',
        roles: ['SUPER_ADMIN', 'HOSTEL_ADMIN', 'MESS_MANAGER'],
      },
    ],
  },

  // ── System ────────────────────────────────────────────────────────────
  {
    label: 'System',
    items: [
      {
        label: 'Audit Logs',
        href: '/dashboard/audit',
        icon: 'ScrollText',
        roles: ['SUPER_ADMIN', 'HOSTEL_ADMIN'],
      },
      {
        label: 'Settings',
        href: '/dashboard/settings',
        icon: 'Settings',
        roles: [
          'SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN',
          'ACCOUNTS_OFFICER', 'MESS_MANAGER', 'MESS_STAFF',
          'SECURITY_GUARD', 'MAINTENANCE_STAFF', 'STUDENT', 'PARENT',
        ],
      },
    ],
  },
];

/**
 * Flat list (backward-compat). Derived from NAV_SECTIONS.
 */
export const NAV_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);

// Status options
export const USER_STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'PENDING_VERIFICATION', label: 'Pending' },
] as const;

export const HOSTEL_TYPES = [
  { value: 'BOYS', label: 'Boys' },
  { value: 'GIRLS', label: 'Girls' },
  { value: 'CO_ED', label: 'Co-Ed' },
] as const;

export const ROOM_TYPES = [
  { value: 'SINGLE', label: 'Single' },
  { value: 'DOUBLE', label: 'Double' },
  { value: 'TRIPLE', label: 'Triple' },
  { value: 'QUAD', label: 'Quad' },
  { value: 'DORMITORY', label: 'Dormitory' },
] as const;

export const ROLES = [
  'SUPER_ADMIN',
  'HOSTEL_ADMIN',
  'WARDEN',
  'DEPUTY_WARDEN',
  'ACCOUNTS_OFFICER',
  'MESS_MANAGER',
  'MESS_STAFF',
  'SECURITY_GUARD',
  'MAINTENANCE_STAFF',
  'STUDENT',
  'PARENT',
] as const;

export const BUILDING_STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'UNDER_CONSTRUCTION', label: 'Under Construction' },
  { value: 'UNDER_MAINTENANCE', label: 'Under Maintenance' },
] as const;

export const ASSIGNMENT_STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'VACATED', label: 'Vacated' },
  { value: 'TRANSFERRED', label: 'Transferred' },
  { value: 'EXPIRED', label: 'Expired' },
] as const;

export const BLOOD_GROUPS = [
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-',
] as const;

export const GENDERS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
] as const;

export const LEAVE_TYPES = [
  { value: 'HOME', label: 'Home' },
  { value: 'MEDICAL', label: 'Medical' },
  { value: 'EMERGENCY', label: 'Emergency' },
  { value: 'OTHER', label: 'Other' },
] as const;

export const LEAVE_STATUSES = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'PARENT_APPROVED', label: 'Parent Approved' },
  { value: 'PARENT_REJECTED', label: 'Parent Rejected' },
  { value: 'WARDEN_APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const;

export const COMPLAINT_CATEGORIES = [
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'ELECTRICAL', label: 'Electrical' },
  { value: 'PLUMBING', label: 'Plumbing' },
  { value: 'MESS', label: 'Mess' },
  { value: 'HYGIENE', label: 'Hygiene' },
  { value: 'SECURITY', label: 'Security' },
  { value: 'OTHER', label: 'Other' },
] as const;

export const COMPLAINT_PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
] as const;

export const COMPLAINT_STATUSES = [
  { value: 'OPEN', label: 'Open' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'REOPENED', label: 'Reopened' },
] as const;

export const NOTICE_PRIORITIES = [
  { value: 'INFO', label: 'Info' },
  { value: 'WARNING', label: 'Warning' },
  { value: 'URGENT', label: 'Urgent' },
] as const;

export const NOTICE_SCOPES = [
  { value: 'ALL', label: 'All' },
  { value: 'BUILDING', label: 'Building' },
  { value: 'HOSTEL', label: 'Hostel' },
] as const;

export const GATE_PASS_STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'USED', label: 'Used' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const;

export const VIOLATION_TYPES = [
  { value: 'LATE_ENTRY', label: 'Late Entry' },
  { value: 'OVERSTAY', label: 'Overstay' },
  { value: 'EARLY_EXIT', label: 'Early Exit' },
] as const;

export const ESCALATION_STATES = [
  { value: 'NONE', label: 'None' },
  { value: 'WARNED', label: 'Warned' },
  { value: 'ESCALATED', label: 'Escalated' },
  { value: 'RESOLVED', label: 'Resolved' },
] as const;

export const NOTIFICATION_CHANNELS = [
  { value: 'IN_APP', label: 'In-App' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'SMS', label: 'SMS' },
  { value: 'PUSH', label: 'Push' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
] as const;

export const NOTIFICATION_STATES = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'SENT', label: 'Sent' },
  { value: 'READ', label: 'Read' },
  { value: 'FAILED', label: 'Failed' },
] as const;

// ── Registration / Hostel Admission ─────────────────────────────────────

export const REGISTRATION_STATUSES = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'DOCUMENTS_PENDING', label: 'Documents Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'ALLOTTED', label: 'Allotted' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'WAITLISTED', label: 'Waitlisted' },
] as const;

export const ADMISSION_MODES = [
  { value: 'CET', label: 'CET' },
  { value: 'COMEDK', label: 'COMEDK' },
  { value: 'MANAGEMENT', label: 'Management' },
  { value: 'NRI', label: 'NRI' },
  { value: 'NRI_SPONSORED', label: 'NRI Sponsored' },
  { value: 'PIO', label: 'PIO' },
  { value: 'FOREIGN_NATIONAL', label: 'Foreign National' },
  { value: 'OTHER', label: 'Other' },
] as const;

export const FEE_TYPES = [
  { value: 'HOSTEL_FEE', label: 'Hostel Fee' },
  { value: 'MESS_FEE', label: 'Mess Fee' },
  { value: 'CAUTION_DEPOSIT', label: 'Caution Deposit' },
  { value: 'OTHER', label: 'Other' },
] as const;

export const MESS_TYPES = [
  { value: 'VEG', label: 'Vegetarian' },
  { value: 'NON_VEG', label: 'Non-Vegetarian' },
] as const;

export const WIZARD_STEPS = [
  'Personal Details',
  'Academic Details',
  'Family Details',
  'Address & Guardian',
  'Documents',
  'Declarations',
] as const;

// ── Attendance Tracking ─────────────────────────────────────────────────────

export const ATTENDANCE_STATUSES = [
  { value: 'PRESENT', label: 'Present', color: '#22c55e' },
  { value: 'ABSENT', label: 'Absent', color: '#ef4444' },
  { value: 'ON_LEAVE', label: 'On Leave', color: '#3b82f6' },
  { value: 'LATE', label: 'Late', color: '#eab308' },
  { value: 'UNKNOWN', label: 'Unknown', color: '#9ca3af' },
] as const;

export const PRESENCE_STATUSES = [
  { value: 'IN_HOSTEL', label: 'In Hostel', color: '#22c55e' },
  { value: 'OUT_CAMPUS', label: 'Out Campus', color: '#f97316' },
  { value: 'ON_LEAVE', label: 'On Leave', color: '#3b82f6' },
] as const;

export const SESSION_STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const;

export const DEVICE_REQUEST_STATUSES = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
] as const;

// ── Mess Management ─────────────────────────────────────────────────────────

export const MEAL_TYPES = [
  { value: 'BREAKFAST', label: 'Breakfast' },
  { value: 'LUNCH', label: 'Lunch' },
  { value: 'SNACKS', label: 'Snacks' },
  { value: 'DINNER', label: 'Dinner' },
] as const;

export const DAYS_OF_WEEK = [
  { value: 'MONDAY', label: 'Monday', short: 'Mon' },
  { value: 'TUESDAY', label: 'Tuesday', short: 'Tue' },
  { value: 'WEDNESDAY', label: 'Wednesday', short: 'Wed' },
  { value: 'THURSDAY', label: 'Thursday', short: 'Thu' },
  { value: 'FRIDAY', label: 'Friday', short: 'Fri' },
  { value: 'SATURDAY', label: 'Saturday', short: 'Sat' },
  { value: 'SUNDAY', label: 'Sunday', short: 'Sun' },
] as const;

export const MENU_STATUSES = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ARCHIVED', label: 'Archived' },
] as const;

export const REBATE_STATUSES = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CREDITED', label: 'Credited' },
] as const;
