// =============================================================================
// BMS Hostel Platform - Enterprise-Grade Seed Script
// Generates realistic data across all roles for manual testing
// =============================================================================

import { PrismaClient, UserStatus, BuildingStatus, BedStatus, AssignmentStatus, HostelStatus, RoomStatus, RoomType, LeaveType, LeaveStatus, ComplaintCategory, ComplaintPriority, ComplaintStatus, NoticePriority, NoticeScope, GateEntryType, GatePassStatus, ViolationType, EscalationState, NotificationState, NotificationChannel } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomMobile(): string {
  const prefixes = ['9876', '9988', '8870', '7849', '9632', '8547', '7012', '9443', '8310', '9740'];
  return pick(prefixes) + String(randomInt(100000, 999999));
}

function randomIP(): string {
  return `192.168.${randomInt(1, 10)}.${randomInt(10, 250)}`;
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(randomInt(6, 22), randomInt(0, 59), randomInt(0, 59));
  return d;
}

// ---------------------------------------------------------------------------
// Realistic Indian name pools (South Indian + North Indian mix)
// ---------------------------------------------------------------------------
const MALE_FIRST_NAMES = [
  'Aarav', 'Aditya', 'Akash', 'Anand', 'Arjun', 'Ashwin', 'Bharath', 'Chetan',
  'Darshan', 'Deepak', 'Ganesh', 'Girish', 'Harsha', 'Hemant', 'Karthik', 'Kiran',
  'Manoj', 'Mohan', 'Naveen', 'Nikhil', 'Pradeep', 'Pranav', 'Rahul', 'Rajesh',
  'Rakesh', 'Ravi', 'Rohit', 'Sachin', 'Sanjay', 'Santosh', 'Shreyas', 'Suhas',
  'Sunil', 'Surya', 'Tejas', 'Varun', 'Vijay', 'Vinay', 'Vishnu', 'Yashwanth',
  'Abhishek', 'Ajay', 'Amith', 'Basavaraj', 'Chethan', 'Dhruv', 'Gagan', 'Hari',
  'Jagadish', 'Kushal', 'Lokesh', 'Madhu', 'Nagendra', 'Om', 'Pavan', 'Raghav',
  'Sagar', 'Tarun', 'Uday', 'Venu', 'Yogesh', 'Zubin', 'Arun', 'Bhuvan',
  'Chirag', 'Dinesh', 'Eshan', 'Firoz', 'Gopal', 'Hitesh', 'Ishaan', 'Jayant',
];

const FEMALE_FIRST_NAMES = [
  'Aanya', 'Aditi', 'Akshata', 'Amrutha', 'Ananya', 'Anjali', 'Anusha', 'Bhavya',
  'Chaitra', 'Deepika', 'Divya', 'Fathima', 'Gayathri', 'Harini', 'Ishita', 'Jyothi',
  'Kavya', 'Keerthana', 'Lavanya', 'Meghana', 'Nandini', 'Neha', 'Pallavi', 'Pooja',
  'Priya', 'Rachana', 'Ranjitha', 'Sahana', 'Sangeetha', 'Shilpa', 'Shreya', 'Sinchana',
  'Sneha', 'Sowmya', 'Spandana', 'Swathi', 'Tanvi', 'Varsha', 'Vidya', 'Yashaswini',
  'Ashwini', 'Bhoomika', 'Chandana', 'Deeksha', 'Eesha', 'Gouri', 'Hamsa', 'Isha',
];

const LAST_NAMES = [
  'Sharma', 'Patel', 'Gowda', 'Shetty', 'Rao', 'Reddy', 'Naik', 'Kumar',
  'Patil', 'Hegde', 'Bhat', 'Acharya', 'Nair', 'Menon', 'Iyengar', 'Iyer',
  'Joshi', 'Kulkarni', 'Deshpande', 'Kamath', 'Shenoy', 'Pai', 'Mallya', 'Srinivas',
  'Murthy', 'Prasad', 'Swamy', 'Verma', 'Singh', 'Gupta', 'Mishra', 'Chauhan',
  'Pillai', 'Gopal', 'Babu', 'Rajan', 'Nayak', 'Bangera', 'Poojary', 'Salian',
  'Kothari', 'Mehta', 'Shah', 'Bhatt', 'Mane', 'Jadhav', 'Shinde', 'Pawar',
];

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3) AppleWebKit/605.1.15 Mobile',
  'Mozilla/5.0 (Linux; Android 14) Chrome/121.0.6167.143 Mobile',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) Safari/17.2',
  'Mozilla/5.0 (X11; Linux x86_64) Firefox/122.0',
  'BMS-Mobile/2.1.0 (Android 14; Samsung Galaxy S24)',
  'BMS-Mobile/2.1.0 (iOS 17.3; iPhone 15 Pro)',
];

// ---------------------------------------------------------------------------
// Role & Permission definitions
// ---------------------------------------------------------------------------
const ROLES = [
  { name: 'SUPER_ADMIN', displayName: 'Super Admin', description: 'Institution-level administrator with full access', isSystem: true },
  { name: 'HOSTEL_ADMIN', displayName: 'Hostel Admin', description: 'Hostel-level administrator', isSystem: true },
  { name: 'WARDEN', displayName: 'Warden', description: 'Hostel warden responsible for student welfare', isSystem: true },
  { name: 'DEPUTY_WARDEN', displayName: 'Deputy Warden', description: 'Deputy warden / Resident tutor', isSystem: true },
  { name: 'ACCOUNTS_OFFICER', displayName: 'Accounts Officer', description: 'Finance and accounts management', isSystem: true },
  { name: 'MESS_MANAGER', displayName: 'Mess Manager', description: 'Mess operations manager', isSystem: true },
  { name: 'MESS_STAFF', displayName: 'Mess Staff', description: 'Mess counter staff for meal scanning', isSystem: true },
  { name: 'SECURITY_GUARD', displayName: 'Security Guard', description: 'Gate security and visitor management', isSystem: true },
  { name: 'MAINTENANCE_STAFF', displayName: 'Maintenance Staff', description: 'Housekeeping and maintenance', isSystem: true },
  { name: 'STUDENT', displayName: 'Student', description: 'Hostel resident student', isSystem: true },
  { name: 'PARENT', displayName: 'Parent / Guardian', description: 'Parent or guardian of a student', isSystem: true },
];

const PERMISSIONS = [
  { name: 'USER_CREATE', module: 'users', description: 'Create new users' },
  { name: 'USER_READ', module: 'users', description: 'View user details' },
  { name: 'USER_UPDATE', module: 'users', description: 'Update user details' },
  { name: 'USER_DELETE', module: 'users', description: 'Deactivate/delete users' },
  { name: 'USER_LIST', module: 'users', description: 'List all users' },
  { name: 'ROLE_ASSIGN', module: 'roles', description: 'Assign roles to users' },
  { name: 'ROLE_REVOKE', module: 'roles', description: 'Revoke roles from users' },
  { name: 'HOSTEL_MANAGE', module: 'hostel', description: 'Manage hostel inventory' },
  { name: 'ROOM_MANAGE', module: 'hostel', description: 'Manage rooms and beds' },
  { name: 'ALLOTMENT_MANAGE', module: 'allotment', description: 'Manage room allotments' },
  { name: 'FINANCE_MANAGE', module: 'finance', description: 'Manage fees and payments' },
  { name: 'PAYMENT_VIEW', module: 'finance', description: 'View payment records' },
  { name: 'GATE_OPERATE', module: 'gate', description: 'Operate gate entry/exit' },
  { name: 'LEAVE_APPROVE', module: 'gate', description: 'Approve leave requests' },
  { name: 'MESS_MANAGE', module: 'mess', description: 'Manage mess operations' },
  { name: 'MESS_SCAN', module: 'mess', description: 'Scan meals at counter' },
  { name: 'COMPLAINT_MANAGE', module: 'complaints', description: 'Manage complaints' },
  { name: 'NOTICE_PUBLISH', module: 'notices', description: 'Publish notices' },
  { name: 'REPORT_VIEW', module: 'reports', description: 'View reports and dashboards' },
  { name: 'AUDIT_VIEW', module: 'audit', description: 'View audit logs' },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: PERMISSIONS.map((p) => p.name),
  HOSTEL_ADMIN: [
    'USER_CREATE', 'USER_READ', 'USER_UPDATE', 'USER_LIST',
    'ROLE_ASSIGN', 'ROLE_REVOKE',
    'HOSTEL_MANAGE', 'ROOM_MANAGE', 'ALLOTMENT_MANAGE',
    'FINANCE_MANAGE', 'PAYMENT_VIEW',
    'LEAVE_APPROVE', 'MESS_MANAGE',
    'COMPLAINT_MANAGE', 'NOTICE_PUBLISH',
    'REPORT_VIEW', 'AUDIT_VIEW',
  ],
  WARDEN: [
    'USER_READ', 'USER_LIST',
    'ROOM_MANAGE', 'ALLOTMENT_MANAGE',
    'PAYMENT_VIEW', 'LEAVE_APPROVE', 'GATE_OPERATE',
    'COMPLAINT_MANAGE', 'NOTICE_PUBLISH', 'REPORT_VIEW',
  ],
  DEPUTY_WARDEN: [
    'USER_READ', 'USER_LIST',
    'LEAVE_APPROVE', 'GATE_OPERATE',
    'COMPLAINT_MANAGE', 'NOTICE_PUBLISH',
  ],
  ACCOUNTS_OFFICER: ['USER_READ', 'USER_LIST', 'FINANCE_MANAGE', 'PAYMENT_VIEW', 'REPORT_VIEW'],
  MESS_MANAGER: ['USER_READ', 'MESS_MANAGE', 'MESS_SCAN', 'REPORT_VIEW'],
  MESS_STAFF: ['MESS_SCAN'],
  SECURITY_GUARD: ['GATE_OPERATE', 'USER_READ'],
  MAINTENANCE_STAFF: ['COMPLAINT_MANAGE'],
  STUDENT: ['PAYMENT_VIEW'],
  PARENT: ['PAYMENT_VIEW'],
};

// ---------------------------------------------------------------------------
// Hostel metadata
// ---------------------------------------------------------------------------
interface HostelMeta {
  code: string;
  name: string;
  type: 'BOYS' | 'GIRLS';
  capacity: number;
}

const HOSTELS: HostelMeta[] = [
  { code: 'KH', name: 'Krishna Hostel', type: 'BOYS', capacity: 200 },
  { code: 'GH', name: 'Ganga Hostel', type: 'GIRLS', capacity: 180 },
  { code: 'VH', name: 'Visvesvaraya Hostel', type: 'BOYS', capacity: 250 },
  { code: 'SH', name: 'Saraswathi Hostel', type: 'GIRLS', capacity: 160 },
  { code: 'CH', name: 'Cauvery Hostel', type: 'BOYS', capacity: 220 },
  { code: 'NH', name: 'Narmada Hostel', type: 'GIRLS', capacity: 140 },
];

// ---------------------------------------------------------------------------
// USN generation
// ---------------------------------------------------------------------------
const BRANCHES = ['CS', 'IS', 'EC', 'EE', 'ME', 'CV', 'CH', 'BT', 'AI', 'ML'];
const COLLEGE_CODE = '1BM';
const ACADEMIC_YEARS = ['22', '23', '24', '25'];

function generateUSN(yearIdx: number, branchIdx: number, seatNum: number): string {
  const year = ACADEMIC_YEARS[yearIdx % ACADEMIC_YEARS.length];
  const branch = BRANCHES[branchIdx % BRANCHES.length];
  return `${COLLEGE_CODE}${year}${branch}${String(seatNum).padStart(3, '0')}`;
}

// ---------------------------------------------------------------------------
// Unique value trackers
// ---------------------------------------------------------------------------
const usedEmails = new Set<string>();
const usedMobiles = new Set<string>();
const usedUSNs = new Set<string>();

function uniqueEmail(first: string, last: string, domain: string): string {
  let email = `${first.toLowerCase()}.${last.toLowerCase()}@${domain}`;
  let counter = 1;
  while (usedEmails.has(email)) {
    email = `${first.toLowerCase()}.${last.toLowerCase()}${counter}@${domain}`;
    counter++;
  }
  usedEmails.add(email);
  return email;
}

function uniqueMobile(): string {
  let mob = randomMobile();
  while (usedMobiles.has(mob)) {
    mob = randomMobile();
  }
  usedMobiles.add(mob);
  return mob;
}

function uniqueUSN(yearIdx: number, branchIdx: number, seatNum: number): string {
  let usn = generateUSN(yearIdx, branchIdx, seatNum);
  while (usedUSNs.has(usn)) {
    seatNum++;
    usn = generateUSN(yearIdx, branchIdx, seatNum);
  }
  usedUSNs.add(usn);
  return usn;
}

// ---------------------------------------------------------------------------
// User type
// ---------------------------------------------------------------------------
interface SeedUser {
  email: string;
  mobile: string | null;
  usn: string | null;
  firstName: string;
  lastName: string;
  status: UserStatus;
  passwordHash: string;
  roleName: string;
  hostelCode?: string;
}

// ---------------------------------------------------------------------------
// MAIN SEED
// ---------------------------------------------------------------------------
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  🏨 BMS Hostel Platform - Enterprise Seed');
  console.log('═══════════════════════════════════════════════════════\n');

  const defaultHash = await bcrypt.hash('Password@123', 12);
  const adminHash = await bcrypt.hash('Admin@123456', 12);

  // =========================================================================
  // 1. ROLES
  // =========================================================================
  console.log('📋 Seeding roles...');
  const roleMap: Record<string, string> = {};
  for (const role of ROLES) {
    const created = await prisma.role.upsert({
      where: { name: role.name },
      update: { displayName: role.displayName, description: role.description },
      create: role,
    });
    roleMap[created.name] = created.id;
  }
  console.log(`   ✓ ${ROLES.length} roles\n`);

  // =========================================================================
  // 2. PERMISSIONS
  // =========================================================================
  console.log('🔑 Seeding permissions...');
  const permissionMap: Record<string, string> = {};
  for (const perm of PERMISSIONS) {
    const created = await prisma.permission.upsert({
      where: { name: perm.name },
      update: { module: perm.module, description: perm.description },
      create: perm,
    });
    permissionMap[created.name] = created.id;
  }
  console.log(`   ✓ ${PERMISSIONS.length} permissions\n`);

  // =========================================================================
  // 3. ROLE-PERMISSION MAPPINGS
  // =========================================================================
  console.log('🔗 Seeding role-permission mappings...');
  let rpCount = 0;
  for (const [roleName, permNames] of Object.entries(ROLE_PERMISSIONS)) {
    const roleId = roleMap[roleName];
    if (!roleId) continue;
    for (const permName of permNames) {
      const permissionId = permissionMap[permName];
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        update: {},
        create: { roleId, permissionId },
      });
      rpCount++;
    }
  }
  console.log(`   ✓ ${rpCount} role-permission mappings\n`);

  // =========================================================================
  // 4. USERS — Enterprise-scale realistic data
  // =========================================================================
  console.log('👤 Seeding users...');
  const allUsers: SeedUser[] = [];
  const createdUserIds: Record<string, string> = {};

  // ---- 4a. Super Admins (2) ----
  allUsers.push({
    email: 'admin@bms.local',
    mobile: '9876543210',
    usn: null,
    firstName: 'Rajendra',
    lastName: 'Prasad',
    status: UserStatus.ACTIVE,
    passwordHash: adminHash,
    roleName: 'SUPER_ADMIN',
  });
  allUsers.push({
    email: 'sysadmin@bms.local',
    mobile: '9876543211',
    usn: null,
    firstName: 'Arvind',
    lastName: 'Krishnamurthy',
    status: UserStatus.ACTIVE,
    passwordHash: adminHash,
    roleName: 'SUPER_ADMIN',
  });
  usedEmails.add('admin@bms.local');
  usedEmails.add('sysadmin@bms.local');
  usedMobiles.add('9876543210');
  usedMobiles.add('9876543211');

  // ---- 4b. Hostel Admins (1 per hostel = 6) ----
  const hostelAdminNames = [
    { first: 'Suresh', last: 'Hegde' },
    { first: 'Lakshmi', last: 'Deshpande' },
    { first: 'Ramachandra', last: 'Bhat' },
    { first: 'Padmavathi', last: 'Iyengar' },
    { first: 'Nagaraj', last: 'Kulkarni' },
    { first: 'Savithri', last: 'Menon' },
  ];
  HOSTELS.forEach((hostel, i) => {
    const n = hostelAdminNames[i];
    allUsers.push({
      email: uniqueEmail(n.first, n.last, 'bms.local'),
      mobile: uniqueMobile(),
      usn: null,
      firstName: n.first,
      lastName: n.last,
      status: UserStatus.ACTIVE,
      passwordHash: defaultHash,
      roleName: 'HOSTEL_ADMIN',
      hostelCode: hostel.code,
    });
  });

  // ---- 4c. Wardens (1 per hostel = 6) ----
  const wardenNames = [
    { first: 'Mahesh', last: 'Rao' },
    { first: 'Sumathi', last: 'Nair' },
    { first: 'Prakash', last: 'Shetty' },
    { first: 'Jayashree', last: 'Kamath' },
    { first: 'Venkatesh', last: 'Gowda' },
    { first: 'Revathi', last: 'Pillai' },
  ];
  HOSTELS.forEach((hostel, i) => {
    const n = wardenNames[i];
    allUsers.push({
      email: uniqueEmail(n.first, n.last, 'bms.local'),
      mobile: uniqueMobile(),
      usn: null,
      firstName: n.first,
      lastName: n.last,
      status: UserStatus.ACTIVE,
      passwordHash: defaultHash,
      roleName: 'WARDEN',
      hostelCode: hostel.code,
    });
  });

  // ---- 4d. Deputy Wardens (2 per hostel = 12) ----
  const dwFirstNames = [
    'Madhukar', 'Srinivasa', 'Ashok', 'Vikas', 'Chandrashekar', 'Umesh',
    'Rekha', 'Shobha', 'Mamatha', 'Geeta', 'Pushpa', 'Roopa',
  ];
  HOSTELS.forEach((hostel, i) => {
    for (let j = 0; j < 2; j++) {
      const idx = i * 2 + j;
      const first = dwFirstNames[idx];
      const last = pick(LAST_NAMES);
      allUsers.push({
        email: uniqueEmail(first, last, 'bms.local'),
        mobile: uniqueMobile(),
        usn: null,
        firstName: first,
        lastName: last,
        status: UserStatus.ACTIVE,
        passwordHash: defaultHash,
        roleName: 'DEPUTY_WARDEN',
        hostelCode: hostel.code,
      });
    }
  });

  // ---- 4e. Accounts Officers (3 global) ----
  const aoNames = [
    { first: 'Ramesh', last: 'Kothari' },
    { first: 'Shantha', last: 'Mehta' },
    { first: 'Jagadish', last: 'Verma' },
  ];
  aoNames.forEach((n) => {
    allUsers.push({
      email: uniqueEmail(n.first, n.last, 'bms.local'),
      mobile: uniqueMobile(),
      usn: null,
      firstName: n.first,
      lastName: n.last,
      status: UserStatus.ACTIVE,
      passwordHash: defaultHash,
      roleName: 'ACCOUNTS_OFFICER',
    });
  });

  // ---- 4f. Mess Managers (1 per hostel = 6) ----
  HOSTELS.forEach((hostel) => {
    const first = pick(MALE_FIRST_NAMES);
    const last = pick(LAST_NAMES);
    allUsers.push({
      email: uniqueEmail(first, last, 'bms.local'),
      mobile: uniqueMobile(),
      usn: null,
      firstName: first,
      lastName: last,
      status: UserStatus.ACTIVE,
      passwordHash: defaultHash,
      roleName: 'MESS_MANAGER',
      hostelCode: hostel.code,
    });
  });

  // ---- 4g. Mess Staff (3 per hostel = 18) ----
  HOSTELS.forEach((hostel) => {
    for (let j = 0; j < 3; j++) {
      const first = pick([...MALE_FIRST_NAMES, ...FEMALE_FIRST_NAMES]);
      const last = pick(LAST_NAMES);
      allUsers.push({
        email: uniqueEmail(first, last, 'bms.local'),
        mobile: uniqueMobile(),
        usn: null,
        firstName: first,
        lastName: last,
        status: UserStatus.ACTIVE,
        passwordHash: defaultHash,
        roleName: 'MESS_STAFF',
        hostelCode: hostel.code,
      });
    }
  });

  // ---- 4h. Security Guards (2 per hostel = 12) ----
  const guardFirstNames = [
    'Ramu', 'Basappa', 'Shankar', 'Kudiya', 'Fakir', 'Manja',
    'Somanna', 'Thimma', 'Papanna', 'Erappa', 'Siddappa', 'Hanuma',
  ];
  HOSTELS.forEach((hostel, i) => {
    for (let j = 0; j < 2; j++) {
      const idx = i * 2 + j;
      const first = guardFirstNames[idx];
      const last = pick(LAST_NAMES);
      allUsers.push({
        email: uniqueEmail(first, last, 'bms.local'),
        mobile: uniqueMobile(),
        usn: null,
        firstName: first,
        lastName: last,
        status: UserStatus.ACTIVE,
        passwordHash: defaultHash,
        roleName: 'SECURITY_GUARD',
        hostelCode: hostel.code,
      });
    }
  });

  // ---- 4i. Maintenance Staff (2 per hostel = 12) ----
  HOSTELS.forEach((hostel) => {
    for (let j = 0; j < 2; j++) {
      const first = pick(MALE_FIRST_NAMES);
      const last = pick(LAST_NAMES);
      allUsers.push({
        email: uniqueEmail(first, last, 'bms.local'),
        mobile: uniqueMobile(),
        usn: null,
        firstName: first,
        lastName: last,
        status: UserStatus.ACTIVE,
        passwordHash: defaultHash,
        roleName: 'MAINTENANCE_STAFF',
        hostelCode: hostel.code,
      });
    }
  });

  // ---- 4j. Students (40 per hostel = 240 students) ----
  let seatCounter = 1;
  const studentUsers: SeedUser[] = [];
  HOSTELS.forEach((hostel, hostelIdx) => {
    const names = hostel.type === 'BOYS' ? MALE_FIRST_NAMES : FEMALE_FIRST_NAMES;
    for (let j = 0; j < 40; j++) {
      const yearIdx = j % 4;
      const branchIdx = (hostelIdx * 7 + j) % BRANCHES.length;
      const first = names[j % names.length];
      const last = LAST_NAMES[(hostelIdx * 40 + j) % LAST_NAMES.length];
      const usn = uniqueUSN(yearIdx, branchIdx, seatCounter++);

      // 85% active, 5% inactive, 5% suspended, 5% pending
      let status: UserStatus = UserStatus.ACTIVE;
      if (j % 20 === 17) status = UserStatus.INACTIVE;
      else if (j % 20 === 18) status = UserStatus.SUSPENDED;
      else if (j % 20 === 19) status = UserStatus.PENDING_VERIFICATION;

      const student: SeedUser = {
        email: uniqueEmail(first, last, 'student.bms.edu'),
        mobile: uniqueMobile(),
        usn,
        firstName: first,
        lastName: last,
        status,
        passwordHash: defaultHash,
        roleName: 'STUDENT',
        hostelCode: hostel.code,
      };
      allUsers.push(student);
      studentUsers.push(student);
    }
  });

  // ---- 4k. Parents (1 per 3 students ≈ 80 parents) ----
  const parentStudents = studentUsers.filter((_, i) => i % 3 === 0);
  parentStudents.forEach((student) => {
    const parentFirst = pick(MALE_FIRST_NAMES);
    const parentLast = student.lastName; // same family name
    allUsers.push({
      email: uniqueEmail(parentFirst, parentLast, 'parent.bms.edu'),
      mobile: uniqueMobile(),
      usn: null,
      firstName: parentFirst,
      lastName: parentLast,
      status: UserStatus.ACTIVE,
      passwordHash: defaultHash,
      roleName: 'PARENT',
    });
  });

  // ---- Persist all users to DB ----
  console.log(`   Creating ${allUsers.length} users...`);
  let userCount = 0;
  const roleCounts: Record<string, number> = {};

  for (const u of allUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        firstName: u.firstName,
        lastName: u.lastName,
        passwordHash: u.passwordHash,
        mobile: u.mobile,
        usn: u.usn,
        status: u.status,
      },
      create: {
        email: u.email,
        mobile: u.mobile,
        usn: u.usn,
        firstName: u.firstName,
        lastName: u.lastName,
        passwordHash: u.passwordHash,
        status: u.status,
      },
    });
    createdUserIds[u.email] = user.id;

    // Assign role
    const roleId = roleMap[u.roleName];
    if (roleId) {
      const existing = await prisma.userRole.findFirst({
        where: { userId: user.id, roleId, revokedAt: null },
      });
      if (!existing) {
        await prisma.userRole.create({
          data: { userId: user.id, roleId },
        });
      }
    }

    roleCounts[u.roleName] = (roleCounts[u.roleName] || 0) + 1;
    userCount++;
    if (userCount % 50 === 0) {
      console.log(`   ... ${userCount}/${allUsers.length} users created`);
    }
  }

  console.log(`   ✓ ${userCount} users created`);
  console.log('   Breakdown:');
  Object.entries(roleCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([role, count]) => {
      console.log(`     • ${role}: ${count}`);
    });
  console.log();

  // =========================================================================
  // 5. AUDIT LOGS — 90 days of realistic activity
  // =========================================================================
  console.log('📝 Seeding audit logs...');

  const adminId = createdUserIds['admin@bms.local'];
  const sysAdminId = createdUserIds['sysadmin@bms.local'];
  const allUserIds = Object.values(createdUserIds);
  const staffIds = allUsers
    .filter((u) => !['STUDENT', 'PARENT'].includes(u.roleName))
    .map((u) => createdUserIds[u.email])
    .filter(Boolean);

  interface AuditEntry {
    userId: string | null;
    action: string;
    resource: string;
    resourceId?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
  }

  const auditEntries: AuditEntry[] = [];

  // ---- 5a. System setup (90-60 days ago) ----
  for (let day = 90; day >= 60; day -= randomInt(1, 3)) {
    auditEntries.push({
      userId: adminId,
      action: 'SYSTEM_CONFIG_UPDATE',
      resource: 'system',
      details: { setting: pick(['smtp', 'sms_gateway', 'payment_gateway', 'branding', 'academic_year']), note: 'Initial system configuration' },
      ipAddress: '192.168.1.10',
      userAgent: USER_AGENTS[0],
      createdAt: daysAgo(day),
    });
  }

  // Hostel creation
  HOSTELS.forEach((hostel, i) => {
    auditEntries.push({
      userId: adminId,
      action: 'HOSTEL_CREATE',
      resource: 'hostel',
      resourceId: `hostel-${hostel.code}`,
      details: { name: hostel.name, type: hostel.type, capacity: hostel.capacity },
      ipAddress: '192.168.1.10',
      userAgent: USER_AGENTS[0],
      createdAt: daysAgo(85 - i),
    });
  });

  // ---- 5b. Staff onboarding (80-30 days ago) ----
  const staffUsersArr = allUsers.filter((u) => !['STUDENT', 'PARENT', 'SUPER_ADMIN'].includes(u.roleName));
  staffUsersArr.forEach((u, i) => {
    auditEntries.push({
      userId: adminId,
      action: 'USER_CREATE',
      resource: 'users',
      resourceId: createdUserIds[u.email],
      details: { email: u.email, role: u.roleName, hostel: u.hostelCode || 'global' },
      ipAddress: '192.168.1.10',
      userAgent: USER_AGENTS[0],
      createdAt: daysAgo(80 - Math.floor(i * 50 / staffUsersArr.length)),
    });
  });

  // Student onboarding (60-20 days ago)
  studentUsers.forEach((s, i) => {
    const hostelAdmin = allUsers.find((u) => u.roleName === 'HOSTEL_ADMIN' && u.hostelCode === s.hostelCode);
    const creatorId = hostelAdmin ? createdUserIds[hostelAdmin.email] : adminId;
    auditEntries.push({
      userId: creatorId,
      action: 'USER_CREATE',
      resource: 'users',
      resourceId: createdUserIds[s.email],
      details: { email: s.email, usn: s.usn, role: 'STUDENT', hostel: s.hostelCode },
      ipAddress: randomIP(),
      userAgent: pick(USER_AGENTS),
      createdAt: daysAgo(60 - Math.floor(i * 40 / studentUsers.length)),
    });
  });

  // ---- 5c. Login activity (past 30 days) ----
  for (let day = 30; day >= 0; day--) {
    // Admin logins
    for (let k = 0; k < randomInt(1, 2); k++) {
      auditEntries.push({
        userId: pick([adminId, sysAdminId]),
        action: 'LOGIN',
        resource: 'auth',
        details: { method: 'email' },
        ipAddress: '192.168.1.10',
        userAgent: pick(USER_AGENTS.slice(0, 2)),
        createdAt: daysAgo(day),
      });
    }

    // Staff logins (5-15/day)
    for (let k = 0; k < randomInt(5, 15); k++) {
      auditEntries.push({
        userId: pick(staffIds),
        action: 'LOGIN',
        resource: 'auth',
        details: { method: pick(['email', 'mobile']) },
        ipAddress: randomIP(),
        userAgent: pick(USER_AGENTS),
        createdAt: daysAgo(day),
      });
    }

    // Student logins (higher on weekdays)
    const isWeekend = new Date(daysAgo(day)).getDay() % 6 === 0;
    const dailyStudentLogins = isWeekend ? randomInt(10, 25) : randomInt(30, 60);
    for (let k = 0; k < dailyStudentLogins; k++) {
      auditEntries.push({
        userId: pick(allUserIds.slice(-240)),
        action: 'LOGIN',
        resource: 'auth',
        details: { method: pick(['email', 'usn', 'mobile']), platform: pick(['web', 'mobile']) },
        ipAddress: randomIP(),
        userAgent: pick(USER_AGENTS),
        createdAt: daysAgo(day),
      });
    }

    // Failed logins (2-5/day)
    for (let k = 0; k < randomInt(2, 5); k++) {
      auditEntries.push({
        userId: null,
        action: 'LOGIN_FAILED',
        resource: 'auth',
        details: {
          identifier: pick([
            `${pick(MALE_FIRST_NAMES).toLowerCase()}@student.bms.edu`,
            `unknown${randomInt(1, 99)}@gmail.com`,
            randomMobile(),
          ]),
          reason: pick(['INVALID_CREDENTIALS', 'ACCOUNT_SUSPENDED', 'ACCOUNT_NOT_FOUND']),
        },
        ipAddress: randomIP(),
        userAgent: pick(USER_AGENTS),
        createdAt: daysAgo(day),
      });
    }
  }

  // ---- 5d. User management (past 30 days) ----
  for (let day = 30; day >= 0; day -= randomInt(1, 3)) {
    for (let k = 0; k < randomInt(1, 4); k++) {
      auditEntries.push({
        userId: pick(staffIds),
        action: pick(['USER_UPDATE', 'ROLE_ASSIGN', 'USER_STATUS_CHANGE']),
        resource: 'users',
        resourceId: pick(allUserIds),
        details: {
          changes: pick([
            { field: 'mobile', from: randomMobile(), to: randomMobile() },
            { field: 'status', from: 'PENDING_VERIFICATION', to: 'ACTIVE' },
            { field: 'email', note: 'Email updated by admin' },
            { field: 'role', added: pick(['STUDENT', 'WARDEN', 'DEPUTY_WARDEN']) },
          ]),
        },
        ipAddress: randomIP(),
        userAgent: pick(USER_AGENTS),
        createdAt: daysAgo(day),
      });
    }
  }

  // ---- 5e. Token refresh & logout (past 14 days) ----
  for (let day = 14; day >= 0; day--) {
    for (let k = 0; k < randomInt(10, 30); k++) {
      auditEntries.push({
        userId: pick(allUserIds),
        action: 'TOKEN_REFRESH',
        resource: 'auth',
        ipAddress: randomIP(),
        userAgent: pick(USER_AGENTS),
        createdAt: daysAgo(day),
      });
    }
    for (let k = 0; k < randomInt(5, 15); k++) {
      auditEntries.push({
        userId: pick(allUserIds),
        action: 'LOGOUT',
        resource: 'auth',
        ipAddress: randomIP(),
        userAgent: pick(USER_AGENTS),
        createdAt: daysAgo(day),
      });
    }
  }

  // ---- 5f. Password events ----
  for (let i = 0; i < 25; i++) {
    auditEntries.push({
      userId: pick(allUserIds),
      action: pick(['PASSWORD_CHANGE', 'PASSWORD_RESET_REQUEST', 'PASSWORD_RESET_COMPLETE']),
      resource: 'auth',
      details: { initiatedBy: pick(['self', 'admin']) },
      ipAddress: randomIP(),
      userAgent: pick(USER_AGENTS),
      createdAt: daysAgo(randomInt(0, 60)),
    });
  }

  // ---- 5g. Permission audit events ----
  for (let i = 0; i < 15; i++) {
    auditEntries.push({
      userId: adminId,
      action: pick(['ROLE_PERMISSION_GRANT', 'ROLE_PERMISSION_REVOKE']),
      resource: 'roles',
      resourceId: pick(Object.values(roleMap)),
      details: {
        permission: pick(PERMISSIONS.map((p) => p.name)),
        note: pick(['Annual review adjustment', 'New module access', 'Security policy update']),
      },
      ipAddress: '192.168.1.10',
      userAgent: USER_AGENTS[0],
      createdAt: daysAgo(randomInt(10, 80)),
    });
  }

  // ---- 5h. Security events ----
  for (let i = 0; i < 8; i++) {
    auditEntries.push({
      userId: null,
      action: 'RATE_LIMIT_EXCEEDED',
      resource: 'security',
      details: {
        endpoint: pick(['/api/v1/auth/login', '/api/v1/auth/refresh', '/api/v1/users']),
        ip: randomIP(),
        count: randomInt(50, 200),
      },
      ipAddress: randomIP(),
      userAgent: pick(USER_AGENTS),
      createdAt: daysAgo(randomInt(0, 30)),
    });
  }

  // Sort chronologically & batch insert
  auditEntries.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  console.log(`   Inserting ${auditEntries.length} audit log entries...`);
  let auditCount = 0;
  const BATCH_SIZE = 100;

  for (let i = 0; i < auditEntries.length; i += BATCH_SIZE) {
    const batch = auditEntries.slice(i, i + BATCH_SIZE);
    await prisma.auditLog.createMany({
      data: batch.map((entry) => ({
        userId: entry.userId,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId || null,
        details: entry.details ? (entry.details as any) : null,
        ipAddress: entry.ipAddress || null,
        userAgent: entry.userAgent || null,
        createdAt: entry.createdAt,
      })),
    });
    auditCount += batch.length;
    if (auditCount % 500 === 0 || auditCount === auditEntries.length) {
      console.log(`   ... ${auditCount}/${auditEntries.length} audit logs inserted`);
    }
  }
  console.log(`   ✓ ${auditCount} audit log entries\n`);

  // =========================================================================
  // 6. BUILDINGS
  // =========================================================================
  console.log('🏢 Seeding buildings...');

  const BUILDINGS = [
    { code: 'MAIN', name: 'Main Campus Block', location: 'Bengaluru', address: 'Bull Temple Rd, Basavanagudi, Bengaluru 560019', contactNo: '080-26622130', email: 'main@bms.local', totalFloors: 5, status: BuildingStatus.ACTIVE },
    { code: 'ANNEX', name: 'Annexe Block', location: 'Bengaluru', address: 'Gavipuram Extension, Bengaluru 560019', contactNo: '080-26622140', email: 'annexe@bms.local', totalFloors: 4, status: BuildingStatus.ACTIVE },
    { code: 'NORTH', name: 'North Campus Block', location: 'Bengaluru', address: 'Hanumanthanagar, Bengaluru 560019', contactNo: '080-26622150', email: 'north@bms.local', totalFloors: 3, status: BuildingStatus.UNDER_MAINTENANCE },
  ];

  const buildingMap: Record<string, string> = {};
  for (const b of BUILDINGS) {
    const building = await prisma.building.upsert({
      where: { code: b.code },
      update: { name: b.name, location: b.location, address: b.address, contactNo: b.contactNo, email: b.email, totalFloors: b.totalFloors, status: b.status },
      create: b,
    });
    buildingMap[b.code] = building.id;
  }
  console.log(`   ✓ ${BUILDINGS.length} buildings\n`);

  // =========================================================================
  // 7. HOSTELS (link to buildings, create rooms & beds)
  // =========================================================================
  console.log('🏨 Seeding hostels with rooms & beds...');

  // Map hostels → buildings: KH, VH, CH → MAIN; GH, SH → ANNEX; NH → NORTH
  const hostelBuildingMap: Record<string, string> = {
    KH: 'MAIN', VH: 'MAIN', CH: 'MAIN',
    GH: 'ANNEX', SH: 'ANNEX',
    NH: 'NORTH',
  };

  const hostelIdMap: Record<string, string> = {};
  const allBedIds: string[] = [];
  const hostelBedIds: Record<string, string[]> = {};

  for (const h of HOSTELS) {
    const buildingId = buildingMap[hostelBuildingMap[h.code]] || null;
    const hostel = await prisma.hostel.upsert({
      where: { code: h.code },
      update: {
        name: h.name,
        type: h.type as any,
        capacity: h.capacity,
        status: HostelStatus.ACTIVE,
        buildingId,
        address: `${h.name}, BMS Campus, Bengaluru 560019`,
        contactNo: `080-2662${2100 + HOSTELS.indexOf(h)}`,
        email: `${h.code.toLowerCase()}@bms.local`,
      },
      create: {
        code: h.code,
        name: h.name,
        type: h.type as any,
        capacity: h.capacity,
        status: HostelStatus.ACTIVE,
        buildingId,
        address: `${h.name}, BMS Campus, Bengaluru 560019`,
        contactNo: `080-2662${2100 + HOSTELS.indexOf(h)}`,
        email: `${h.code.toLowerCase()}@bms.local`,
      },
    });
    hostelIdMap[h.code] = hostel.id;
    hostelBedIds[h.code] = [];

    // Create 10 rooms per hostel (floors 0-2, rooms 01-04 per floor, plus extras)
    for (let roomIdx = 0; roomIdx < 10; roomIdx++) {
      const floor = Math.floor(roomIdx / 4);
      const roomNum = (roomIdx % 4) + 1;
      const roomNo = `${floor}${String(roomNum).padStart(2, '0')}`;
      const roomType = roomIdx < 2 ? RoomType.SINGLE : roomIdx < 8 ? RoomType.DOUBLE : RoomType.TRIPLE;
      const capacity = roomType === 'SINGLE' ? 1 : roomType === 'DOUBLE' ? 2 : 3;

      const room = await prisma.room.upsert({
        where: { hostelId_roomNo: { hostelId: hostel.id, roomNo } },
        update: { floor, type: roomType, capacity, status: RoomStatus.AVAILABLE },
        create: {
          hostelId: hostel.id,
          roomNo,
          floor,
          block: 'A',
          type: roomType,
          capacity,
          status: RoomStatus.AVAILABLE,
          amenities: ['Fan', 'Desk', 'Cupboard'],
        },
      });

      // Create beds for this room
      for (let bedIdx = 1; bedIdx <= capacity; bedIdx++) {
        const bedNo = `${roomNo}-B${bedIdx}`;
        const bed = await prisma.bed.upsert({
          where: { roomId_bedNo: { roomId: room.id, bedNo } },
          update: { status: BedStatus.VACANT },
          create: {
            roomId: room.id,
            bedNo,
            status: BedStatus.VACANT,
          },
        });
        allBedIds.push(bed.id);
        hostelBedIds[h.code].push(bed.id);
      }
    }
  }
  const totalRooms = HOSTELS.length * 10;
  console.log(`   ✓ ${HOSTELS.length} hostels, ${totalRooms} rooms, ${allBedIds.length} beds\n`);

  // =========================================================================
  // 8. BUILDING POLICIES
  // =========================================================================
  console.log('📋 Seeding building policies...');

  const POLICIES = [
    {
      buildingCode: 'MAIN',
      weekdayCurfew: '22:00', weekendCurfew: '23:00', toleranceMin: 15,
      parentApprovalRequired: true, maxLeaveDays: 7,
      wardenEscalationMin: 30, repeatedViolationThreshold: 3,
      notifyParentOnExit: true, notifyParentOnEntry: true, notifyParentOnLate: true, notifyWardenOnLate: true,
      overrideNotes: 'Standard policy for main campus hostels',
    },
    {
      buildingCode: 'ANNEX',
      weekdayCurfew: '21:30', weekendCurfew: '22:30', toleranceMin: 10,
      parentApprovalRequired: true, maxLeaveDays: 5,
      wardenEscalationMin: 20, repeatedViolationThreshold: 2,
      notifyParentOnExit: true, notifyParentOnEntry: true, notifyParentOnLate: true, notifyWardenOnLate: true,
      overrideNotes: 'Stricter policy for girls hostels in annexe block',
    },
    {
      buildingCode: 'NORTH',
      weekdayCurfew: '22:00', weekendCurfew: '23:00', toleranceMin: 15,
      parentApprovalRequired: false, maxLeaveDays: 10,
      wardenEscalationMin: 45, repeatedViolationThreshold: 5,
      notifyParentOnExit: false, notifyParentOnEntry: false, notifyParentOnLate: true, notifyWardenOnLate: true,
      overrideNotes: 'Relaxed policy for north campus (under maintenance)',
    },
  ];

  let policyCount = 0;
  for (const p of POLICIES) {
    const buildingId = buildingMap[p.buildingCode];
    if (!buildingId) continue;
    await prisma.buildingPolicy.upsert({
      where: { buildingId_version: { buildingId, version: 1 } },
      update: {},
      create: {
        buildingId,
        version: 1,
        isActive: true,
        weekdayCurfew: p.weekdayCurfew,
        weekendCurfew: p.weekendCurfew,
        toleranceMin: p.toleranceMin,
        parentApprovalRequired: p.parentApprovalRequired,
        maxLeaveDays: p.maxLeaveDays,
        wardenEscalationMin: p.wardenEscalationMin,
        repeatedViolationThreshold: p.repeatedViolationThreshold,
        notifyParentOnExit: p.notifyParentOnExit,
        notifyParentOnEntry: p.notifyParentOnEntry,
        notifyParentOnLate: p.notifyParentOnLate,
        notifyWardenOnLate: p.notifyWardenOnLate,
        overrideNotes: p.overrideNotes,
        createdBy: adminId,
      },
    });
    policyCount++;
  }
  console.log(`   ✓ ${policyCount} building policies\n`);

  // =========================================================================
  // 9. STUDENT PROFILES
  // =========================================================================
  console.log('🎓 Seeding student profiles...');

  const BRANCH_DEPARTMENT: Record<string, string> = {
    CS: 'Computer Science & Engineering',
    IS: 'Information Science & Engineering',
    EC: 'Electronics & Communication',
    EE: 'Electrical & Electronics',
    ME: 'Mechanical Engineering',
    CV: 'Civil Engineering',
    CH: 'Chemical Engineering',
    BT: 'Biotechnology',
    AI: 'Artificial Intelligence & Data Science',
    ML: 'Machine Learning',
  };

  const BLOOD_GROUP_LIST = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
  const GENDER_LIST = ['Male', 'Female'];
  const COURSES = ['B.E.', 'B.Tech', 'M.Tech'];
  const ADDRESSES = [
    'No. 42, 2nd Cross, Jayanagar 4th Block, Bengaluru 560041',
    '#15, MG Road, Mysuru 570001, Karnataka',
    'Plot 8, Nehru Nagar, Hubli 580020, Karnataka',
    '3rd Floor, Lakshmi Apartments, Mangaluru 575001',
    '#201, Rajiv Gandhi Nagar, Belgaum 590010',
    'H.No. 112, Vidyanagar, Davanagere 577004',
    '#56, Railway Station Road, Tumkur 572101',
    'Flat 4B, Shanti Enclave, Udupi 576101, Karnataka',
  ];

  let profileCount = 0;
  const studentUserIds: string[] = []; // user IDs of students that got profiles

  for (const s of studentUsers) {
    const userId = createdUserIds[s.email];
    if (!userId || s.status !== UserStatus.ACTIVE) continue;

    // Extract branch from USN for department mapping
    const usnMatch = s.usn?.match(/1BM\d{2}(\w{2})\d+/);
    const branchCode = usnMatch ? usnMatch[1] : 'CS';
    const yearIdx = s.usn ? parseInt(s.usn.substring(3, 5)) : 22;
    const academicYear = yearIdx <= 22 ? 4 : yearIdx <= 23 ? 3 : yearIdx <= 24 ? 2 : 1;
    const isMale = MALE_FIRST_NAMES.includes(s.firstName);

    try {
      await prisma.studentProfile.upsert({
        where: { userId },
        update: {},
        create: {
          userId,
          dateOfBirth: new Date(2000 + randomInt(0, 5), randomInt(0, 11), randomInt(1, 28)),
          bloodGroup: pick(BLOOD_GROUP_LIST),
          gender: isMale ? 'Male' : 'Female',
          department: BRANCH_DEPARTMENT[branchCode] || 'Computer Science & Engineering',
          course: pick(COURSES),
          year: academicYear,
          semester: academicYear * 2 - randomInt(0, 1),
          admissionDate: new Date(2020 + (4 - academicYear), 7, randomInt(1, 30)),
          emergencyContact: randomMobile(),
          permanentAddress: pick(ADDRESSES),
          medicalConditions: randomInt(1, 10) <= 2 ? pick(['Asthma', 'Diabetes Type 1', 'Peanut allergy', 'Spectacles - myopia']) : null,
        },
      });
      profileCount++;
      studentUserIds.push(userId);
    } catch {
      // Skip if foreign key issue
    }
  }
  console.log(`   ✓ ${profileCount} student profiles\n`);

  // =========================================================================
  // 10. GUARDIAN LINKS
  // =========================================================================
  console.log('👨‍👩‍👦 Seeding guardian links...');

  let guardianLinkCount = 0;
  const parentUsers = allUsers.filter((u) => u.roleName === 'PARENT');

  // Link parents to their corresponding students (parent was created for every 3rd student)
  const linkedStudents = studentUsers.filter((_, i) => i % 3 === 0);
  for (let i = 0; i < Math.min(parentUsers.length, linkedStudents.length); i++) {
    const parentId = createdUserIds[parentUsers[i].email];
    const studentId = createdUserIds[linkedStudents[i].email];
    if (!parentId || !studentId) continue;

    try {
      await prisma.guardianLink.upsert({
        where: { studentId_guardianId: { studentId, guardianId: parentId } },
        update: {},
        create: {
          studentId,
          guardianId: parentId,
          relation: pick(['Father', 'Mother', 'Guardian']),
          isPrimary: true,
        },
      });
      guardianLinkCount++;
    } catch {
      // Skip duplicates
    }
  }
  console.log(`   ✓ ${guardianLinkCount} guardian links\n`);

  // =========================================================================
  // 11. BED ASSIGNMENTS (assign active students to beds)
  // =========================================================================
  console.log('🛏️  Seeding bed assignments...');

  let assignmentCount = 0;
  let bedPointer = 0;

  // Assign first N active students to available beds in their hostel
  for (const s of studentUsers) {
    if (s.status !== UserStatus.ACTIVE) continue;
    const userId = createdUserIds[s.email];
    if (!userId || !s.hostelCode) continue;

    const beds = hostelBedIds[s.hostelCode];
    if (!beds || bedPointer >= beds.length) { bedPointer = 0; continue; }

    // Only assign ~60% of students to beds
    if (randomInt(1, 10) > 6) continue;

    const bedId = beds[bedPointer % beds.length];
    bedPointer++;

    try {
      // Check if bed already occupied
      const existing = await prisma.bedAssignment.findFirst({
        where: { bedId, status: AssignmentStatus.ACTIVE },
      });
      if (existing) continue;

      await prisma.bedAssignment.create({
        data: {
          studentId: userId,
          bedId,
          status: AssignmentStatus.ACTIVE,
          assignedAt: daysAgo(randomInt(10, 50)),
          assignedById: adminId,
          reason: pick(['First-year allotment', 'Annual renewal', 'Transfer request', 'New admission']),
          notes: randomInt(1, 5) === 1 ? 'Assigned during orientation week' : null,
        },
      });

      // Mark bed as occupied
      await prisma.bed.update({
        where: { id: bedId },
        data: { status: BedStatus.OCCUPIED, studentId: userId },
      });

      assignmentCount++;
    } catch {
      // Skip conflicts
    }
  }
  console.log(`   ✓ ${assignmentCount} bed assignments\n`);

  // =========================================================================
  // 12. LEAVE REQUESTS
  // =========================================================================
  console.log('📅 Seeding leave requests...');

  const leaveTypes = [LeaveType.HOME, LeaveType.MEDICAL, LeaveType.EMERGENCY, LeaveType.OTHER];
  const leaveReasons: Record<string, string[]> = {
    HOME: ['Family function', 'Festival leave', 'Relative wedding', 'Home visit', 'Parent health checkup', 'Family emergency'],
    MEDICAL: ['Dental appointment', 'Eye checkup', 'Fever and cold', 'Hospital follow-up', 'Lab tests', 'Surgery consultation'],
    EMERGENCY: ['Family emergency', 'Accident at home', 'Natural disaster', 'Urgent family matter'],
    OTHER: ['Internship interview', 'Competitive exam', 'Driving license test', 'Passport appointment', 'Visa interview'],
  };

  const activeStudents = studentUsers.filter((s) => s.status === UserStatus.ACTIVE);
  const wardenEmails = allUsers.filter((u) => u.roleName === 'WARDEN').map((u) => u.email);
  const parentEmails = allUsers.filter((u) => u.roleName === 'PARENT').map((u) => u.email);

  let leaveCount = 0;
  for (let i = 0; i < Math.min(60, activeStudents.length); i++) {
    const s = activeStudents[i];
    const studentId = createdUserIds[s.email];
    const hostelId = hostelIdMap[s.hostelCode || 'KH'];
    const type = pick(leaveTypes);
    const reasons = leaveReasons[type] || leaveReasons['OTHER'];
    const fromDays = randomInt(1, 30);
    const duration = randomInt(1, 5);
    const fromDate = daysAgo(fromDays);
    const toDate = new Date(fromDate); toDate.setDate(toDate.getDate() + duration);

    let status: LeaveStatus;
    let parentApprovalAt: Date | null = null;
    let wardenApprovalAt: Date | null = null;
    let rejectedAt: Date | null = null;
    let rejectionReason: string | null = null;
    let wardenId: string | null = null;
    let parentId: string | null = null;

    const roll = randomInt(1, 10);
    if (roll <= 3) {
      status = LeaveStatus.PENDING;
    } else if (roll <= 5) {
      status = LeaveStatus.PARENT_APPROVED;
      parentId = parentEmails.length ? createdUserIds[pick(parentEmails)] : null;
      parentApprovalAt = daysAgo(fromDays - 1);
    } else if (roll <= 8) {
      status = LeaveStatus.WARDEN_APPROVED;
      parentId = parentEmails.length ? createdUserIds[pick(parentEmails)] : null;
      parentApprovalAt = daysAgo(fromDays - 1);
      wardenId = wardenEmails.length ? createdUserIds[pick(wardenEmails)] : null;
      wardenApprovalAt = daysAgo(fromDays - 1);
    } else if (roll === 9) {
      status = LeaveStatus.REJECTED;
      wardenId = wardenEmails.length ? createdUserIds[pick(wardenEmails)] : null;
      rejectedAt = daysAgo(fromDays - 1);
      rejectionReason = pick(['Insufficient reason', 'Exam period — no leaves', 'Already on leave', 'Too many leaves this month']);
    } else {
      status = LeaveStatus.CANCELLED;
    }

    try {
      await prisma.leaveRequest.create({
        data: {
          studentId,
          hostelId,
          type,
          fromDate,
          toDate,
          reason: pick(reasons),
          status,
          parentApprovalAt,
          wardenApprovalAt,
          rejectedAt,
          rejectionReason,
          wardenId,
          parentId,
        },
      });
      leaveCount++;
    } catch { /* skip duplicates */ }
  }
  console.log(`   ✓ ${leaveCount} leave requests\n`);

  // =========================================================================
  // 13. COMPLAINTS
  // =========================================================================
  console.log('🔧 Seeding complaints...');

  const categories = [ComplaintCategory.MAINTENANCE, ComplaintCategory.ELECTRICAL, ComplaintCategory.PLUMBING, ComplaintCategory.HYGIENE, ComplaintCategory.MESS, ComplaintCategory.SECURITY, ComplaintCategory.OTHER];
  const priorities = [ComplaintPriority.LOW, ComplaintPriority.MEDIUM, ComplaintPriority.HIGH, ComplaintPriority.CRITICAL];
  const complaintSubjects: Record<string, string[]> = {
    MAINTENANCE: ['Broken door lock', 'Window crack', 'Cupboard hinge broken', 'Ceiling fan wobbling', 'Wall paint peeling'],
    ELECTRICAL: ['Socket not working', 'Light flickering', 'Power outage in room', 'Switch sparking', 'AC not cooling'],
    PLUMBING: ['Tap leaking', 'Blocked drain', 'Low water pressure', 'Geyser not heating', 'Toilet flush issue'],
    HYGIENE: ['Room not cleaned', 'Bathroom dirty', 'Corridor dusty', 'Garbage not collected', 'Pest issue'],
    MESS: ['Food is cold', 'Meal quality poor', 'Insufficient quantity', 'Stale food served', 'No variety in menu'],
    SECURITY: ['CCTV not working', 'Gate left open', 'Stranger spotted', 'Theft complaint', 'Missing belongings'],
    OTHER: ['WiFi not working', 'Laundry machine broken', 'Water purifier issue', 'Noise complaint', 'Roommate issue'],
  };

  const maintenanceEmails = allUsers.filter((u) => u.roleName === 'MAINTENANCE_STAFF').map((u) => u.email);

  let complaintCount = 0;
  for (let i = 0; i < Math.min(45, activeStudents.length); i++) {
    const s = activeStudents[i];
    const studentId = createdUserIds[s.email];
    const hostelId = hostelIdMap[s.hostelCode || 'KH'];
    const category = pick(categories);
    const subjects = complaintSubjects[category] || complaintSubjects['OTHER'];
    const priority = pick(priorities);

    let status: ComplaintStatus;
    let assignedToId: string | null = null;
    let resolvedAt: Date | null = null;
    let resolution: string | null = null;

    const roll = randomInt(1, 6);
    if (roll === 1) {
      status = ComplaintStatus.OPEN;
    } else if (roll === 2) {
      status = ComplaintStatus.ASSIGNED;
      assignedToId = maintenanceEmails.length ? createdUserIds[pick(maintenanceEmails)] : null;
    } else if (roll === 3) {
      status = ComplaintStatus.IN_PROGRESS;
      assignedToId = maintenanceEmails.length ? createdUserIds[pick(maintenanceEmails)] : null;
    } else if (roll <= 5) {
      status = ComplaintStatus.RESOLVED;
      assignedToId = maintenanceEmails.length ? createdUserIds[pick(maintenanceEmails)] : null;
      resolvedAt = daysAgo(randomInt(1, 5));
      resolution = pick(['Fixed and verified', 'Part replaced', 'Cleaned and sanitized', 'Issue resolved by staff', 'Forwarded to vendor, resolved']);
    } else {
      status = ComplaintStatus.CLOSED;
      assignedToId = maintenanceEmails.length ? createdUserIds[pick(maintenanceEmails)] : null;
      resolvedAt = daysAgo(randomInt(5, 15));
      resolution = 'Closed after verification';
    }

    try {
      const complaint = await prisma.complaint.create({
        data: {
          studentId,
          hostelId,
          category,
          subject: pick(subjects),
          description: `Detailed description of the issue. Room ${randomInt(100, 310)}, Floor ${randomInt(0, 2)}. Needs attention.`,
          priority,
          status,
          assignedToId,
          resolvedAt,
          resolution,
        },
      });

      // Add 0-3 comments
      const commentCount = randomInt(0, 3);
      for (let c = 0; c < commentCount; c++) {
        const commenter = pick([studentId, ...(assignedToId ? [assignedToId] : []), adminId]);
        await prisma.complaintComment.create({
          data: {
            complaintId: complaint.id,
            userId: commenter,
            message: pick([
              'Please look into this urgently.',
              'We are working on it.',
              'Any update on this?',
              'Part has been ordered.',
              'Scheduled for tomorrow.',
              'Issue persists, please re-check.',
              'Thank you for the quick fix!',
            ]),
          },
        });
      }
      complaintCount++;
    } catch { /* skip */ }
  }
  console.log(`   ✓ ${complaintCount} complaints\n`);

  // =========================================================================
  // 14. NOTICES
  // =========================================================================
  console.log('📢 Seeding notices...');

  const noticeData = [
    { title: 'Hostel Day Celebration', body: 'Annual hostel day will be celebrated on 15th March. All students are requested to participate. Events include cultural programs, sports, and prize distribution.', priority: NoticePriority.INFO, scope: NoticeScope.ALL },
    { title: 'Water Supply Interruption', body: 'Due to maintenance work, water supply will be interrupted on 20th Feb from 10 AM to 4 PM. Please store water in advance.', priority: NoticePriority.WARNING, scope: NoticeScope.ALL },
    { title: 'Emergency Evacuation Drill', body: 'Emergency evacuation drill will be conducted on 22nd Feb at 11 AM. All residents must participate. Assembly point: Main ground.', priority: NoticePriority.URGENT, scope: NoticeScope.ALL },
    { title: 'Mess Menu Updated', body: 'New mess menu for March has been updated. Breakfast timings changed to 7:30 AM – 9:00 AM. Special diet options available on request.', priority: NoticePriority.INFO, scope: NoticeScope.ALL },
    { title: 'WiFi Maintenance', body: 'WiFi maintenance scheduled for Sunday 2 AM – 6 AM. Internet will be unavailable during this window.', priority: NoticePriority.WARNING, scope: NoticeScope.ALL },
    { title: 'Fee Payment Reminder', body: 'Last date for hostel fee payment is 28th Feb. Late fee of ₹500 will be charged after the deadline.', priority: NoticePriority.URGENT, scope: NoticeScope.ALL },
    { title: 'Krishna Hostel — Room Inspection', body: 'Room inspection for Krishna Hostel scheduled for 25th Feb. Please keep rooms tidy.', priority: NoticePriority.WARNING, scope: NoticeScope.HOSTEL },
    { title: 'Main Block — Fire Safety Check', body: 'Fire safety equipment inspection in Main Campus Block on 23rd Feb. Corridors must be clear.', priority: NoticePriority.WARNING, scope: NoticeScope.BUILDING },
    { title: 'Sports Tournament Registration', body: 'Inter-hostel sports tournament registrations open. Register at the warden office by 10th March.', priority: NoticePriority.INFO, scope: NoticeScope.ALL },
    { title: 'Curfew Timing Change', body: 'Effective 1st March, curfew timings changed to 10:30 PM (weekdays) and 11 PM (weekends).', priority: NoticePriority.URGENT, scope: NoticeScope.ALL },
    { title: 'Guest Registration Mandatory', body: 'All visitors must register at the gate. Unregistered visitors will not be allowed entry.', priority: NoticePriority.WARNING, scope: NoticeScope.ALL },
    { title: 'Library Hours Extended', body: 'Hostel library will now be open until 11 PM during exam season (March 10 – April 15).', priority: NoticePriority.INFO, scope: NoticeScope.ALL },
  ];

  const publisherIds = [...wardenEmails, ...allUsers.filter(u => u.roleName === 'HOSTEL_ADMIN').map(u => u.email)]
    .map(e => createdUserIds[e]).filter(Boolean);

  let noticeCount = 0;
  for (const n of noticeData) {
    const publishedById = pick(publisherIds) || adminId;
    const published = daysAgo(randomInt(1, 30));
    const expiresAt = new Date(published);
    expiresAt.setDate(expiresAt.getDate() + randomInt(15, 60));

    try {
      const notice = await prisma.notice.create({
        data: {
          title: n.title,
          body: n.body,
          priority: n.priority,
          scope: n.scope,
          targetBuildingId: n.scope === NoticeScope.BUILDING ? buildingMap['MAIN'] : null,
          targetHostelId: n.scope === NoticeScope.HOSTEL ? hostelIdMap['KH'] : null,
          publishedById,
          publishedAt: published,
          expiresAt,
          isActive: randomInt(1, 10) <= 8, // 80% active
        },
      });

      // Mark some as read by random students
      const readersCount = randomInt(5, 25);
      const shuffledStudents = [...activeStudents].sort(() => Math.random() - 0.5).slice(0, readersCount);
      for (const reader of shuffledStudents) {
        const readerId = createdUserIds[reader.email];
        try {
          await prisma.noticeRecipient.create({
            data: { noticeId: notice.id, userId: readerId, readAt: daysAgo(randomInt(0, 10)) },
          });
        } catch { /* unique constraint skip */ }
      }
      noticeCount++;
    } catch { /* skip */ }
  }
  console.log(`   ✓ ${noticeCount} notices\n`);

  // =========================================================================
  // 15. GATE ENTRIES
  // =========================================================================
  console.log('🚪 Seeding gate entries...');

  const gateNos = ['Gate-1', 'Gate-2', 'Gate-3'];
  const securityEmails = allUsers.filter(u => u.roleName === 'SECURITY_GUARD').map(u => u.email);

  let gateEntryCount = 0;
  for (let i = 0; i < Math.min(80, activeStudents.length); i++) {
    const s = activeStudents[i % activeStudents.length];
    const studentId = createdUserIds[s.email];
    const scannedById = securityEmails.length ? createdUserIds[pick(securityEmails)] : adminId;
    const daysBack = randomInt(0, 14);
    const timestamp = daysAgo(daysBack);
    const type = i % 2 === 0 ? GateEntryType.IN : GateEntryType.OUT;
    const isLate = type === GateEntryType.IN && randomInt(1, 5) === 1;

    try {
      await prisma.gateEntry.create({
        data: {
          studentId,
          type,
          gateNo: pick(gateNos),
          scannedById,
          timestamp,
          isLateEntry: isLate,
          lateMinutes: isLate ? randomInt(5, 90) : 0,
          notes: isLate ? pick(['Arrived late from city', 'Bus delayed', 'Medical visit ran late']) : null,
        },
      });
      gateEntryCount++;
    } catch { /* skip */ }
  }
  console.log(`   ✓ ${gateEntryCount} gate entries\n`);

  // =========================================================================
  // 15b. POLICY SNAPSHOTS & VIOLATIONS
  // =========================================================================
  console.log('⚠️  Seeding policy snapshots & violations...');

  // Fetch gate entries that were created as IN (potential violations)
  const inEntries = await prisma.gateEntry.findMany({
    where: { type: GateEntryType.IN },
    take: 30,
    orderBy: { timestamp: 'desc' },
    include: {
      student: {
        include: {
          bedAssignments: {
            where: { status: AssignmentStatus.ACTIVE },
            include: { bed: { include: { room: { include: { hostel: true } } } } },
            take: 1,
          },
        },
      },
    },
  });

  // Get active policies per building
  const activePolicies = await prisma.buildingPolicy.findMany({
    where: { isActive: true },
  });
  const policyByBuilding: Record<string, typeof activePolicies[0]> = {};
  for (const pol of activePolicies) {
    policyByBuilding[pol.buildingId] = pol;
  }

  let snapshotCount = 0;
  let violationCount = 0;
  let notifCount = 0;

  const violationReasons = [
    'Returned late after city outing',
    'Bus from hometown was delayed',
    'Medical visit ran over time',
    'Missed last bus from market',
    'Studying at college library',
    'Returned from cultural event late',
    'Traffic jam on Outer Ring Road',
    'Metro service disrupted',
    'Came back from family function late',
    'Got delayed at college placement drive',
  ];

  const createdViolationIds: string[] = [];

  for (let i = 0; i < Math.min(25, inEntries.length); i++) {
    const entry = inEntries[i];
    const assignment = entry.student.bedAssignments[0];
    if (!assignment) continue;

    const bldgId = assignment.bed.room.hostel.buildingId;
    if (!bldgId) continue;
    const policy = policyByBuilding[bldgId];
    if (!policy) continue;

    const isWeekend = [0, 6].includes(entry.timestamp.getDay());
    const curfew = isWeekend ? (policy.weekendCurfew || '23:00') : (policy.weekdayCurfew || '22:00');

    // Create snapshot
    const snapshot = await prisma.policySnapshot.create({
      data: {
        buildingId: bldgId,
        policyId: policy.id,
        policyVersion: policy.version,
        curfewTimeUsed: curfew,
        toleranceMinUsed: policy.toleranceMin,
        escalationRuleMin: policy.wardenEscalationMin || 30,
        repeatedThreshold: policy.repeatedViolationThreshold || 3,
        violationWindow: policy.violationWindow || 30,
        notifyParentOnExit: policy.notifyParentOnExit,
        notifyParentOnEntry: policy.notifyParentOnEntry,
        notifyParentOnLate: policy.notifyParentOnLate,
        notifyWardenOnLate: policy.notifyWardenOnLate,
      },
    });
    snapshotCount++;

    // Link snapshot to gate entry
    await prisma.gateEntry.update({
      where: { id: entry.id },
      data: { policySnapshotId: snapshot.id },
    });

    // Create violation for late entries (every other one)
    if (i % 2 === 0 && entry.isLateEntry) {
      const violatedBy = entry.lateMinutes || randomInt(5, 60);
      const [ch, cm] = curfew.split(':').map(Number);
      const requestedTime = new Date(entry.timestamp);
      requestedTime.setHours(ch, cm + (policy.toleranceMin || 15), 0, 0);

      const repeatedCount = randomInt(0, 4);
      let escalation: EscalationState = EscalationState.NONE;
      const threshold = policy.repeatedViolationThreshold || 3;
      if (repeatedCount >= threshold) escalation = EscalationState.ESCALATED;
      else if (repeatedCount >= Math.floor(threshold / 2)) escalation = EscalationState.WARNED;

      // Mark ~20% as resolved
      const isResolved = randomInt(1, 5) === 1;
      const resolvedBy = isResolved
        ? (wardenEmails.length ? createdUserIds[pick(wardenEmails)] : adminId)
        : null;

      try {
        const violation = await prisma.violation.create({
          data: {
            studentId: entry.studentId,
            gateEntryId: entry.id,
            policySnapshotId: snapshot.id,
            type: ViolationType.LATE_ENTRY,
            requestedOrApprovedTime: requestedTime,
            actualTime: entry.timestamp,
            violatedByMinutes: violatedBy,
            reason: pick(violationReasons),
            repeatedCountSnapshot: repeatedCount,
            escalationState: isResolved ? EscalationState.RESOLVED : escalation,
            notificationState: NotificationState.SENT,
            resolvedAt: isResolved ? daysAgo(randomInt(0, 3)) : null,
            resolvedById: resolvedBy,
            resolvedNotes: isResolved ? pick(['Warned student verbally', 'Letter sent to parents', 'First-time offense, warned', 'Discussed with student and parent']) : null,
          },
        });
        violationCount++;
        createdViolationIds.push(violation.id);
      } catch { /* skip */ }
    }

    // Create OVERSTAY violation for some entries (every 5th)
    if (i % 5 === 0) {
      const violatedBy = randomInt(30, 240);
      const overstayTime = new Date(entry.timestamp);
      overstayTime.setHours(overstayTime.getHours() - violatedBy / 60);

      try {
        const violation = await prisma.violation.create({
          data: {
            studentId: entry.studentId,
            gateEntryId: entry.id,
            policySnapshotId: snapshot.id,
            type: ViolationType.OVERSTAY,
            requestedOrApprovedTime: overstayTime,
            actualTime: entry.timestamp,
            violatedByMinutes: violatedBy,
            reason: pick(['Leave period expired, student did not return on time', 'Extended stay without approval', 'Failed to return from home on scheduled date']),
            repeatedCountSnapshot: randomInt(0, 2),
            escalationState: pick([EscalationState.NONE, EscalationState.WARNED]),
            notificationState: NotificationState.SENT,
          },
        });
        violationCount++;
        createdViolationIds.push(violation.id);
      } catch { /* skip */ }
    }
  }
  console.log(`   ✓ ${snapshotCount} policy snapshots, ${violationCount} violations\n`);

  // =========================================================================
  // 15c. NOTIFICATIONS
  // =========================================================================
  console.log('🔔 Seeding notifications...');

  // Gather recipient pools
  const parentIds = parentEmails.map((e) => createdUserIds[e]).filter(Boolean);
  const wardenIds = wardenEmails.map((e) => createdUserIds[e]).filter(Boolean);
  const studentIds = activeStudents.map((s) => createdUserIds[s.email]).filter(Boolean);
  const allRecipientIds = [...parentIds, ...wardenIds, ...studentIds];

  const notifTemplates = [
    { title: 'Student checked out', message: '{student} has exited at {gate}. Time: {time}.' },
    { title: 'Student returned safely', message: '{student} has returned to the hostel. On-time entry recorded.' },
    { title: '⚠️ Late entry alert', message: '{student} arrived {minutes} minutes past curfew. Policy violation auto-recorded.' },
    { title: 'Leave request approved', message: 'Your leave request has been approved by the warden.' },
    { title: 'Violation warning', message: 'You have accumulated {count} violations this month. Further infractions may lead to escalation.' },
    { title: 'Escalation notice', message: 'A repeated violations escalation has been filed for {student}. Immediate review required.' },
    { title: 'Complaint resolved', message: 'Your complaint #{id} has been resolved. Please confirm satisfaction.' },
    { title: 'New notice posted', message: 'A new notice "{title}" has been published. Please check the notice board.' },
    { title: 'Parent notification', message: 'Your ward {student} violated curfew. Violated by {minutes} minutes.' },
    { title: 'System maintenance', message: 'The hostel management system will undergo maintenance tonight from 2 AM to 4 AM.' },
  ];

  // Create ~40 spread across users
  for (let i = 0; i < 40; i++) {
    const recipientId = pick(allRecipientIds);
    if (!recipientId) continue;
    const template = pick(notifTemplates);
    const dBack = randomInt(0, 14);
    const notifTime = daysAgo(dBack);
    const isRead = randomInt(1, 3) === 1;

    // Optionally link to a violation
    const hasViolation = template.title.includes('Late') || template.title.includes('Violation') || template.title.includes('Escalation');
    const violationId = hasViolation && createdViolationIds.length ? pick(createdViolationIds) : null;

    try {
      await prisma.notification.create({
        data: {
          recipientId,
          channel: pick([NotificationChannel.IN_APP, NotificationChannel.IN_APP, NotificationChannel.IN_APP, NotificationChannel.EMAIL]),
          title: template.title,
          message: template.message
            .replace('{student}', pick(MALE_FIRST_NAMES) + ' ' + pick(LAST_NAMES))
            .replace('{gate}', pick(['Gate-1', 'Gate-2', 'Gate-3']))
            .replace('{time}', `${randomInt(18, 23)}:${String(randomInt(0, 59)).padStart(2, '0')}`)
            .replace('{minutes}', String(randomInt(5, 90)))
            .replace('{count}', String(randomInt(2, 5)))
            .replace('{id}', String(randomInt(1000, 9999)))
            .replace('{title}', pick(['Hostel Day Celebration', 'Exam Timetable Update', 'Water Supply Disruption'])),
          state: isRead ? NotificationState.READ : NotificationState.SENT,
          readAt: isRead ? daysAgo(randomInt(0, dBack)) : null,
          sentAt: notifTime,
          violationId,
        },
      });
      notifCount++;
    } catch { /* skip */ }
  }
  console.log(`   ✓ ${notifCount} notifications\n`);

  // =========================================================================
  // 16. GATE PASSES
  // =========================================================================
  console.log('🎫 Seeding gate passes...');

  let gatePassCount = 0;
  for (let i = 0; i < Math.min(30, activeStudents.length); i++) {
    const s = activeStudents[i * 2 % activeStudents.length];
    const studentId = createdUserIds[s.email];
    const validFrom = daysAgo(randomInt(0, 10));
    const validTo = new Date(validFrom);
    validTo.setHours(validTo.getHours() + randomInt(2, 48));

    let status: GatePassStatus;
    const roll = randomInt(1, 4);
    if (roll === 1) status = GatePassStatus.ACTIVE;
    else if (roll === 2) status = GatePassStatus.USED;
    else if (roll === 3) status = GatePassStatus.EXPIRED;
    else status = GatePassStatus.CANCELLED;

    try {
      await prisma.gatePass.create({
        data: {
          studentId,
          purpose: pick(['Family visit', 'Medical appointment', 'Shopping', 'Event attendance', 'Bank work', 'Internship interview', 'Driving class']),
          visitorName: randomInt(1, 3) === 1 ? `${pick(MALE_FIRST_NAMES)} ${pick(LAST_NAMES)}` : null,
          visitorPhone: randomInt(1, 3) === 1 ? uniqueMobile() : null,
          validFrom,
          validTo,
          status,
          approvedById: pick(publisherIds) || adminId,
        },
      });
      gatePassCount++;
    } catch { /* skip */ }
  }
  console.log(`   ✓ ${gatePassCount} gate passes\n`);

  // =========================================================================
  // 17. SUMMARY
  // =========================================================================
  console.log('═══════════════════════════════════════════════════════');
  console.log('  ✅ SEED COMPLETED SUCCESSFULLY');
  console.log('═══════════════════════════════════════════════════════');
  console.log();
  console.log('  📊 Data Summary:');
  console.log(`     Roles:               ${ROLES.length}`);
  console.log(`     Permissions:         ${PERMISSIONS.length}`);
  console.log(`     Role-Perm Mappings:  ${rpCount}`);
  console.log(`     Users:               ${userCount}`);
  Object.entries(roleCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([role, count]) => {
      console.log(`       └─ ${role.padEnd(20)} ${count}`);
    });
  console.log(`     Audit Logs:          ${auditCount}`);
  console.log(`     Buildings:           ${BUILDINGS.length}`);
  console.log(`     Hostels:             ${HOSTELS.length}`);
  console.log(`     Rooms:               ${totalRooms}`);
  console.log(`     Beds:                ${allBedIds.length}`);
  console.log(`     Building Policies:   ${policyCount}`);
  console.log(`     Student Profiles:    ${profileCount}`);
  console.log(`     Guardian Links:      ${guardianLinkCount}`);
  console.log(`     Bed Assignments:     ${assignmentCount}`);
  console.log(`     Leave Requests:      ${leaveCount}`);
  console.log(`     Complaints:          ${complaintCount}`);
  console.log(`     Notices:             ${noticeCount}`);
  console.log(`     Gate Entries:        ${gateEntryCount}`);
  console.log(`     Policy Snapshots:    ${snapshotCount}`);
  console.log(`     Violations:          ${violationCount}`);
  console.log(`     Notifications:       ${notifCount}`);
  console.log(`     Gate Passes:         ${gatePassCount}`);
  console.log();
  console.log('  🏨 Hostels Represented:');
  HOSTELS.forEach((h) => {
    console.log(`     └─ ${h.name} (${h.code}) [${h.type}] — capacity ${h.capacity}`);
  });
  console.log();
  console.log('  🔐 Login Credentials:');
  console.log('     ┌─────────────────────────────────────────────────');
  console.log('     │ Super Admin:  admin@bms.local / Admin@123456');
  console.log('     │ Sys Admin:    sysadmin@bms.local / Admin@123456');
  console.log('     │ All Others:   <email> / Password@123');
  console.log('     └─────────────────────────────────────────────────');
  console.log();
  console.log('  💡 Example logins by role:');
  const printedRoles = new Set<string>();
  for (const u of allUsers) {
    if (printedRoles.has(u.roleName)) continue;
    if (u.roleName === 'SUPER_ADMIN') { printedRoles.add(u.roleName); continue; }
    console.log(`     • ${u.roleName.padEnd(20)} ${u.email}`);
    printedRoles.add(u.roleName);
  }
  console.log();
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
