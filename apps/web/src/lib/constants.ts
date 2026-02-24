// Navigation routes
export const NAV_ITEMS = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'LayoutDashboard',
    roles: ['SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN'],
  },
  {
    label: 'Users',
    href: '/dashboard/users',
    icon: 'Users',
    roles: ['SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN'],
  },
  {
    label: 'Hostels',
    href: '/dashboard/hostels',
    icon: 'Building2',
    roles: ['SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN'],
  },
  {
    label: 'Rooms',
    href: '/dashboard/rooms',
    icon: 'DoorOpen',
    roles: ['SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN'],
  },
  {
    label: 'Buildings',
    href: '/dashboard/buildings',
    icon: 'Building',
    roles: ['SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN'],
  },
  {
    label: 'Policies',
    href: '/dashboard/policies',
    icon: 'ShieldCheck',
    roles: ['SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN'],
  },
  {
    label: 'Students',
    href: '/dashboard/students',
    icon: 'GraduationCap',
    roles: ['SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN'],
  },
  {
    label: 'Allotments',
    href: '/dashboard/allotments',
    icon: 'BedDouble',
    roles: ['SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN'],
  },
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
    roles: ['SUPER_ADMIN', 'HOSTEL_ADMIN'],
  },
] as const;

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
